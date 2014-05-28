/**
 @TODO
    - numeric range
    - handle parameters change (content, range)
    - momentum spin
    - add AMD/CommonJS/globals support, inject into container using initializer
*/
App.SpinBoxComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile(
        '{{view App.SpinBoxRowsView}}'+
        '{{spin-box-selection-win}}'
    ),

    classNames: ['spinbox'],
    attributeBindings: ['tabindex'],
    visibleRows: 5,
    rowHeight: 28,
    circular: true,
    tabindex: null,
    bufferSize: 20,
    transitionDuration: 400,
    finishDelay: 300,

    _totalSpinOffset: 0,
    _betweenRowOffset: 0,

    setup: function() {
        this.$el = this.$();
        this.set('_selectedIndex', this.indexOf(this.get('value')));
        //make sure visibleRows is an odd number
        if(this.get('visibleRows') % 2 !== 1) {
            this.incrementProperty('visibleRows');
        }
        this.adjustHeight();
        this.$el.on('mousewheel DOMMouseScroll', Em.run.bind(this, this.handleMouseWheel));
    }.on('didInsertElement'),

    teardown: function() {
        this.$el.off();
    }.on('willDestroyElement'),

    numRowViews: function() {
        return this.get('visibleRows') + (this.get('bufferSize') * 2);
    }.property('bufferSize', 'visibleRows'),

    height: function() {
        return this.get('rowHeight') * this.get('visibleRows');
    }.property('rowHeight', 'visibleRows'),

    adjustHeight: function() {
        this.$el.height(this.get('height'));
    }.observes('height'),

    renderRows: function() {
        var rowView = App.SpinBoxRowComponent,
            rowH = this.get('rowHeight'),
            numRows = this.get('numRowViews'),
            startIndex = this.indexOf(this.get('value')) - Math.floor(numRows / 2),
            views = [];

        for(var i=0; i<numRows; i++) {
            views.push(rowView.create({
                index: startIndex + i,
                value: this.valueAt(startIndex + i),
                top: rowH * i
            }));
        }

        this.get('rowsView').setObjects(views);
    },

    valueAt: function(index) {
        return this.get('content')[this.get('circular') ? this.adjustedIndex(index) : index];
    },

    indexOf: function(value) {
        var index = this.get('content').indexOf(value);
        return index === -1 ? 0 : index;
    },

    selectedIndex: function() {
        return this.adjustedIndex(this.get('_selectedIndex'));
    }.property('_selectedIndex'),

    contentLength: function() {
        return this.get('content').length;
    }.property('content'),

    adjustedIndex: function(index) {
        var len = this.get('contentLength');

        if(index < 0) {
            index = index % len;
            index = index === 0 ? 0 : len + index;
        } else if(index >= len) {
            index = index % len;
        }

        return index;
    },

    cycleRows: function(direction) {
        var ct = this.get('rowsView'),
            rowH = this.get('rowHeight'),
            prevChild = ct.objectAt(direction === 'down' ? ct.get('childViews').length - 1 : 0),
            child = ct[direction === 'down' ? 'shiftObject' : 'popObject'](),
            newChildIndex = prevChild.get('index') + (direction === 'down' ? 1 : -1);

        ct[direction === 'down' ? 'pushObject' : 'unshiftObject'](child);
        child.setProperties({
            top: prevChild.get('top') + (direction === 'down' ? rowH : -rowH),
            index: newChildIndex,
            value: this.valueAt(newChildIndex)
        });
    },

    spin: function(yOffset, scheduleFinish) {
            var ct = this.get('rowsView'),
            rowH = this.get('rowHeight'),
            curOffset = ct.get('yOffset'),
            selIndex = this.get('_selectedIndex'),
            curIndex = selIndex !== null ? selIndex : this.get('_prevSelectedIndex'),
            totalOffset = this.get('_totalSpinOffset') + yOffset,
            betweenRowOffset = this.get('_betweenRowOffset') + yOffset,
            newIndex = curIndex + ((totalOffset / rowH) * -1);

        if(!this.get('circular') && (newIndex < 0 || Math.ceil(newIndex) >= this.get('contentLength'))) {
            return;
        }

        Em.run.cancel(this.get('_finishSpinTimer'));

        if(Math.abs(betweenRowOffset) >= rowH) {
            betweenRowOffset = 0;
            this.cycleRows(yOffset < 0 ? 'down' : 'up');
        }
        
        ct.adjustYOffset(yOffset);

        this.setProperties({
            _prevSelectedIndex: curIndex,
            _selectedIndex: null,
            _totalSpinOffset: totalOffset,
            _betweenRowOffset: betweenRowOffset,
            _finishSpinTimer: scheduleFinish ? Em.run.later(this, this.finishSpin, this.get('finishDelay')) : null
        });
    },

    finishSpin: function() {
        var offset = this.get('_totalSpinOffset'),
            rowH = this.get('rowHeight'),
            overScroll = Math.abs(offset % rowH),
            prevIndex = this.get('_prevSelectedIndex'),
            newIndex,
            newValue;

        //if there was no change in the offset, just revert back to the previously selected value
        if(offset === 0) {
            return this.setProperties({
                _selectedIndex: prevIndex !== null ? prevIndex : this.get('_selectedIndex'),
                _prevSelectedIndex: null,
                _totalSpinOffset: 0,
                _betweenRowOffset: 0
            });
        }

        if(overScroll > 0) {
            if(overScroll < (rowH / 2)) {
                return this.spin(offset < 0 ? overScroll : -overScroll, true);
            } else {
                return this.spin(offset < 0 ? -(rowH - overScroll) : rowH - overScroll, true);
            }
        }

        newIndex = prevIndex + ((offset / rowH) * -1);
        newValue = this.valueAt(newIndex);
        this.setProperties({
            _totalSpinOffset: 0,
            _betweenRowOffset: 0,
            value: newValue,
            _selectedIndex: newIndex,
            _prevSelectedIndex: null
        });

        this.correctRowPositions();

        //send the action after all bindings have been synced
        Em.run.scheduleOnce('sync', this, function() {
            this.sendAction('onUpdate', newValue, this.adjustedIndex(newIndex));
        });
    },

    correctRowPositions: function() {
        var ct = this.get('rowsView'),
            selRowIndex = ct.indexOf(ct.findBy('selected', true)),
            centerIndex = Math.ceil(ct.get('childViews').length / 2) - 1,
            offset = centerIndex - selRowIndex;

        if(offset !== 0) {
            for(var i = 0; i < Math.abs(offset); i++) {
                this.cycleRows(offset < 0 ? 'down' : 'up');
            }
        }
    },

    handleOptionsChange: function() {
        this.renderRows();
    }.observes('content', 'range'),

    handleSpinUpWhen: function() {
        if(!this.get('spinUpWhen')) return;
        this.spin(this.get('rowHeight'));
        this.set('spinUpWhen', false);
    }.observes('spinUpWhen'),

    handleSpinDownWhen: function() {
        if(!this.get('spinDownWhen')) return;
        this.spin(-this.get('rowHeight'));
        this.set('spinDownWhen', false);
    }.observes('spinDownWhen'),

    handleTouchStart: function(e) {
        this.setProperties({
            _touchStartTime: e.timeStamp,
            _touchStartY: e.originalEvent.touches[0].pageY
        });

        //@todo stop in-progress momentum phase if needed

        this.get('rowsView').disableTransitions();
        e.preventDefault();
    }.on('touchStart'),

    handleTouchMove: function(e) {
        var pageY = e.originalEvent.touches[0].pageY,
            prevY = this.get('_touchMoveY') ? this.get('_touchMoveY') : this.get('_touchStartY');
            offset = pageY - prevY;
        
        this.setProperties({
            _touchMoveY: pageY,
            _touchMoveTime: e.timeStamp
        });

        this.spin(offset, false);
        e.preventDefault();
    }.on('touchMove'),

    handleTouchEnd: function(e) {
        this.setProperties({
            _touchEndTime: e.timeStamp,
            _touchMoveY: null
        });

        //@todo momentum scrolling phase (try to use CSS-based custom easing function when applying `transition` properties)

        this.get('rowsView').enableTransitions();
        this.finishSpin();
        e.preventDefault();
    }.on('touchEnd'),

    handleKeyDown: function(e) {
        if(e.keyCode != 38 && e.keyCode != 40) return;
        e.preventDefault();
        this.spin((e.keyCode == 38 ? 1 : -1) * this.get('rowHeight'), true);
    }.on('keyDown'),

    handleMouseWheel: function(e) {
        var origEvent = e.originalEvent;
        e.preventDefault();
        this.spin(((origEvent.wheelDelta > 0 || origEvent.detail < 0) ? 1 : -1) * this.get('rowHeight'), true);
    },

    registerRowsView: function(view) {
        this.set('rowsView', view);
        this.renderRows();
    }
});
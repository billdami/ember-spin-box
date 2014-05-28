App.SpinBoxComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile(
        '{{view App.SpinBoxItemsView}}'+
        '{{spin-box-selection-win}}'
    ),

    classNames: ['spinbox'],
    attributeBindings: ['tabindex'],
    visibleRows: 5,
    rowHeight: 28,
    tabindex: null,
    bufferSize: 20,
    transitionDuration: 400,
    finishDelay: 300,

    _totalSpinOffset: 0,
    _betweenRowOffset: 0,

    setup: function() {
        var initIndex = this.indexOf(this.get('value'));
        this.$el = this.$();
        this.adjustHeight();
        this.set('_selectedIndex', initIndex);
        this.$el.on('mousewheel DOMMouseScroll', Em.run.bind(this, this.handleMouseWheel));
    }.on('didInsertElement'),

    teardown: function() {
        this.$el.off();
    }.on('willDestroyElement'),

    numItemViews: function() {
        return this.get('visibleRows') + (this.get('bufferSize') * 2);
    }.property('bufferSize', 'visibleRows'),

    height: function() {
        return this.get('rowHeight') * this.get('visibleRows');
    }.property('rowHeight', 'visibleRows'),

    adjustHeight: function() {
        this.$el.height(this.get('height'));
    }.observes('height'),

    renderRows: function() {
        var rowView = App.SpinBoxItemComponent,
            rowH = this.get('rowHeight'),
            numRows = this.get('numItemViews'),
            startIndex = this.indexOf(this.get('value')) - Math.floor(this.get('numItemViews') / 2),
            views = [];

        for(var i=0; i<numRows; i++) {
            views.push(rowView.create({
                index: startIndex + i,
                value: this.valueAt(startIndex + i),
                top: rowH * i
            }));
        }

        this.get('itemsView').pushObjects(views);
    },

    valueAt: function(index) {
        return this.get('content')[this.adjustedIndex(index)];
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

    spin: function(yOffset) {
            var ct = this.get('itemsView'),
            rowH = this.get('rowHeight'),
            selIndex = this.get('_selectedIndex'),
            betweenRowOffset = this.get('_betweenRowOffset') + yOffset,
            totalOffset = this.get('_totalSpinOffset') + yOffset,
            child,
            prevChild,
            newIndex;

        Em.run.cancel(this.get('_finishSpinTimer'));

        if(Math.abs(betweenRowOffset) >= rowH) {
            betweenRowOffset = 0;

            if(yOffset > 0) {
                prevChild = ct.objectAt(0);
                newIndex = prevChild.get('index') - 1;
                child = ct.popObject();
                ct.unshiftObject(child);
                child.setProperties({
                    top: prevChild.get('top') - rowH,
                    index: newIndex,
                    value: this.valueAt(newIndex)
                });
            } else {
                prevChild = ct.objectAt(ct.get('childViews').length - 1);
                newIndex = prevChild.get('index') + 1;
                child = ct.shiftObject();
                ct.pushObject(child);
                child.setProperties({
                    top: prevChild.get('top') + rowH,
                    index: newIndex,
                    value: this.valueAt(newIndex)
                });
            }
        }
        
        ct.adjustYOffset(yOffset);

        this.setProperties({
            _prevSelectedIndex: selIndex !== null ? selIndex : this.get('_prevSelectedIndex'),
            _selectedIndex: null,
            _totalSpinOffset: totalOffset,
            _betweenRowOffset: betweenRowOffset,
            _finishSpinTimer: Em.run.later(this, this.finishSpin, this.get('finishDelay'))
        });
    },

    finishSpin: function() {
        if(this.get('_disableFinishSpin')) return;

        var offset = this.get('_totalSpinOffset'),
            rowH = this.get('rowHeight'),
            overScroll = Math.abs(offset % rowH),
            prevIndex = this.get('_prevSelectedIndex'),
            newIndex,
            newValue;

        if(overScroll > 0) {
            if(overScroll < (rowH / 2)) {
                return this.spin(offset < 0 ? overScroll : -overScroll);
            } else {
                return this.spin(offset < 0 ? -(rowH - overScroll) : rowH - overScroll);
            }
        }

        newIndex = prevIndex + ((offset / rowH) * -1);
        newValue = this.valueAt(newIndex);

        this.setProperties({
            _selectedIndex: newIndex,
            _totalSpinOffset: 0,
            _betweenRowOffset: 0,
            value: newValue
        });

        if(offset !== 0) {
            //send the action after all bindings have been synced
            Em.run.scheduleOnce('sync', this, function() {
                this.sendAction('onUpdate', newValue, this.adjustedIndex(newIndex));
            });
        }
    },

    handleTouchStart: function(e) {
        this.setProperties({
            _touchStartTime: e.timeStamp,
            _touchStartY: e.originalEvent.touches[0].pageY,
            _disableFinishSpin: true
        });

        //@todo stop in-progress momentum phase if needed

        this.get('itemsView').disableTransitions();
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

        this.spin(offset);
        e.preventDefault();
    }.on('touchMove'),

    handleTouchEnd: function(e) {
        this.setProperties({
            _touchEndTime: e.timeStamp,
            _touchMoveY: null,
            _disableFinishSpin: false
        });

        //@todo momentum scrolling phase (try to use CSS-based custom easing function when applying `transition` properties)

        this.get('itemsView').enableTransitions();
        this.finishSpin();
        e.preventDefault();
    }.on('touchEnd'),

    handleKeyDown: function(e) {
        if(e.keyCode != 38 && e.keyCode != 40) return;
        e.preventDefault();
        this.spin((e.keyCode == 38 ? 1 : -1) * this.get('rowHeight'));
    }.on('keyDown'),

    handleMouseWheel: function(e) {
        var origEvent = e.originalEvent;
        e.preventDefault();
        this.spin(((origEvent.wheelDelta > 0 || origEvent.detail < 0) ? 1 : -1) * this.get('rowHeight'));
    },

    registerItemsView: function(view) {
        this.set('itemsView', view);
        this.renderRows();
    }
});
App.SpinBoxItemComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile('{{value}}'),
    classNames: ['spinbox-row'],
    classNameBindings: ['selected'],
    attributeBindings: ['style'],

    selected: function() {
        return this.get('index') === this.get('parentView.parentView._selectedIndex');
    }.property('index', 'parentView.parentView._selectedIndex'),

    style: function() {
        return 'top:' + this.get('top') + 'px';
    }.property('top')
});
App.SpinBoxItemsView = Ember.ContainerView.extend({
    classNames: ['spinbox-rows'],
    transitionDuration: 500,

    setup: function() {
        this.$el = this.$();
        this.get('parentView').registerItemsView(this);
        this.positionEl();
    }.on('didInsertElement'),

    adjustYOffset: function(offset) {
        this.set('yOffset', this.get('yOffset') + offset);
    },

    positionEl: function() {
        var yOffset = (this.get('parentView.bufferSize')) * this.get('parentView.rowHeight') * -1;
        this.set('yOffset', yOffset);

        Em.run.next(this, this.enableTransitions);
    }.observes('parentView.rowHeight', 'parentView.visibleRows', 'parentView.bufferSize'),

    enableTransitions: function() {
        var cssVal = 'transform ' + (this.get('parentView.transitionDuration') / 1000) + 's ease';

        this.$el.css({
            '-webkit-transition': '-webkit-' + cssVal,
            '-moz-transition': '-moz-' + cssVal,
            '-ms-transition': '-ms-' + cssVal,
            '-o-transition': '-o-' + cssVal,
            'transition': cssVal
        });
    },

    handleOffsetChange: function() {
        var cssVal = 'translateY(' + this.get('yOffset') + 'px)';
        this.$el.css({
            '-webkit-transform': cssVal,
            '-moz-tranform': cssVal,
            '-ms-tranform': cssVal,
            '-o-transform': cssVal,
            'transform': cssVal
        });
    }.observes('yOffset')
});
App.SpinBoxSelectionWinComponent = Ember.Component.extend({
    classNames: ['spinbox-selection-window'],

    setup: function() {
        this.positionEl();
    }.on('didInsertElement'),

    positionEl: function() {
        var rowH = this.get('parentView.rowHeight');
        this.$().css('margin-top', '-' + (rowH / 2) + 'px');
    }.observes('parentView.rowHeight')
});
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

    setup: function() {
        this.$el = this.$();
        this.adjustHeight();
        this.set('_selectedIndex', this.indexOf(this.get('value')));
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
                index: this.adjustedIndex(startIndex + i),
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

    spin: function(direction, distance) {
            var ct = this.get('itemsView'),
            rowH = this.get('rowHeight'),
            selIndex = this.get('_selectedIndex'),
            child,
            prevChild,
            newIndex,
            yOffset;

        Em.run.cancel(this.get('_finishSpinTimer'));

        if(direction === 'up') {
            yOffset = distance;
            prevChild = ct.objectAt(0);
            newIndex = prevChild.get('index') - 1;
            child = ct.popObject();
            ct.unshiftObject(child);
            child.setProperties({
                top: prevChild.get('top') - rowH,
                index: this.adjustedIndex(newIndex),
                value: this.valueAt(newIndex)
            });
        } else {
            yOffset = distance * -1;
            prevChild = ct.objectAt(ct.get('childViews').length - 1);
            newIndex = prevChild.get('index') + 1;
            child = ct.shiftObject();
            ct.pushObject(child);
            child.setProperties({
                top: prevChild.get('top') + rowH,
                index: this.adjustedIndex(newIndex),
                value: this.valueAt(newIndex)
            });
        }
        
        ct.adjustYOffset(yOffset);

        this.setProperties({
            _prevSelectedIndex: selIndex !== null ? selIndex : this.get('_prevSelectedIndex'),
            _selectedIndex: null,
            _totalSpinOffset: this.get('_totalSpinOffset') + yOffset,
            _finishSpinTimer: Em.run.later(this, this.finishSpin, this.get('finishDelay'))
        });
    },

    finishSpin: function() {
        var offset = this.get('_totalSpinOffset'),
            rowH = this.get('rowHeight'),
            overScroll = Math.abs(offset % rowH),
            prevIndex = this.get('_prevSelectedIndex'),
            newIndex = prevIndex + ((offset / rowH) * -1);

        if(offset === 0) {
            return;
        } else if(overScroll > 0) {
            return this.spin(offset < 0 ? 'down' : 'up', overScroll < (rowH / 2) ? overScroll : (rowH - overScroll));
        }

        this.setProperties({
            _selectedIndex: this.adjustedIndex(newIndex),
            _totalSpinOffset: 0,
            value: this.valueAt(newIndex)
        });
    },

    handleTouchStart: function(e) {
        e.preventDefault();
        
    }.on('touchStart'),

    handleTouchMove: function(e) {
        e.preventDefault();

    }.on('touchMove'),

    handleTouchEnd: function(e) {
        e.preventDefault();
        
    }.on('touchEnd'),

    handleKeyDown: function(e) {
        if(e.keyCode != 38 && e.keyCode != 40) return;
        e.preventDefault();
        this.spin(e.keyCode == 38 ? 'up' : 'down', this.get('rowHeight'));
    }.on('keyDown'),

    handleMouseWheel: function(e) {
        var origEvent = e.originalEvent;
        e.preventDefault();
        this.spin((origEvent.wheelDelta > 0 || origEvent.detail < 0) ? 'up' : 'down', this.get('rowHeight'));
    },

    registerItemsView: function(view) {
        this.set('itemsView', view);
        this.renderRows();
    }
});
(function(root) {
    var SpinBoxComponent = Ember.Component.extend({
        classNames: ['spinbox'],
        attributeBindings: ['tabindex'],

        layout: Ember.Handlebars.compile(
            '<div class="spinbox-rows">' +
                '{{#each row in rows}}' +
                    '<div {{bind-attr class=":spinbox-row row.selected"}} {{action "rowClick" row.text}}>{{row.text}}</div>' +
                '{{/each}}' +
            '</div>' +
            '<div class="spinbox-selection-window"></div>' 
        ),

        visibleRows: 5,
        rowHeight: 28,
        circular: true,
        value: null,
        tabindex: null,
        
        _selected: null,
        _selectedIndex: 0,
        _scrollAnimDuration: 60,
        _throttledSpinTimer: null,
        _scrollSpeedLimit: 1.2,
        _scrollStartThreshold: 8,
        _swipeMoveThreshold: 500,
        _swipeOffsetThreshold: 20,
        _scrollAcceleration: 0.5,
        _scrollAccelerationThreshold: 300,
        _scrollMultiplier: 1,
        _touchStartTime: 0,
        _touchMoveTime: 0,
        _touchEndTime: 0,
        _touchDistance: 0,
        _touchAccel: 0,
        _touchPageY: null,
        _touchMoveY: null,
        _touchMoveDelta: 0,
        _startSpin: false,
        _momentumScrollTimer: null,

        setup: function() {
            this.$el = this.$();
            this.$rowsCt = this.$('.spinbox-rows:first');
            this.$selectionWin = this.$('.spinbox-selection-window:first');
            this.layoutUI();
            this.initRows();
            this.handleValueChange();
            this.$el.on('mousewheel DOMMouseScroll', Em.run.bind(this, this.handleMouseWheel));
        }.on('didInsertElement'),

        teardown: function() {
            this.$el.off();
        }.on('willDestroyElement'),

        layoutUI: function() {
            this.$el.height(this.get('height'));
            this.$selectionWin.css({
                'height': this.get('rowHeight'),
                'margin-top': '-' + (this.get('rowHeight') / 2) + 'px'
            });
        },

        resetRowsPosition: function() {
            this.$rowsCt.css('top', '-' + this.get('rowHeight') + 'px');
        },

        height: function() {
            return this.get('rowHeight') * this.get('visibleRows');
        }.property('rowHeight', 'visibleRows'),

        maxScrollOffset: function() {
            return this.get('height') * this.get('_scrollSpeedLimit');
        }.property('height', '_scrollSpeedLimit'),

        scrollDuration: function() {
            return this.get('height') * 1.5;
        }.property('height'),

        numPaddingRows: function() {
            return Math.floor(this.get('visibleRows') / 2) + 1;
        }.property('visibleRows'),

        initRows: function() {
            var numRows = (this.get('numPaddingRows') * 2) + 1,
                rows = [];

            for(var i=1; i<=numRows; i++) {
                rows.push(Em.Object.create({text: "", selected: (i === (this.get('numPaddingRows') + 1))}));
            }

            this.set('rows', rows);
        },

        updateRows: function() {
            var selectedIndex = this.get('_selectedIndex'),
                numAvailRows = this.getCeiling(),
                numPadRows = this.get('numPaddingRows'),
                rows = this.get('rows');

            rows[numPadRows].set('text', this.getRowText(selectedIndex, numAvailRows));

            for(var i=1; i<=numPadRows; i++) {
                rows[numPadRows - i].set('text', this.getRowText(selectedIndex - i, numAvailRows));
                rows[numPadRows + i].set('text', this.getRowText(selectedIndex + i, numAvailRows));
            }

            Em.run.scheduleOnce('afterRender', this, this.resetRowsPosition);
        },

        updateSelection: function(updateValueParam) {
            var index = this.get('_selectedIndex'),
                props = { _selected: this.valueAt(index) };

            if(updateValueParam === true) {
                props.value = props._selected;
            }

            this.setProperties(props);
            this.updateRows();
            this.sendAction('onUpdate', props._selected, index);
        },

        getRowText: function(index, ceiling) {
            if(index >= this.getFloor() && index < ceiling) {
                return this.valueAt(index);
            } else if(this.get('circular') === false) {
                return new Handlebars.SafeString('&nbsp;');
            } else {
                index = this.getAdjustedIndex(index, ceiling);
                return this.valueAt(index);
            }
        },

        getCeiling: function() {
            if(Em.isArray(this.get('content'))) {
                return this.get('content').length;
            } else if(Em.isArray(this.get('range'))) {
                var r = this.get('range');
                return typeof r[1] === 'number' ? r[1] + 1 : 0;
            } else {
                return 0;
            }
        },

        getFloor: function() {
            if(Em.isArray(this.get('content'))) {
                return 0;
            } else {
                var r = this.get('range');
                return Em.isArray(r) && typeof r[0] === 'number' ? r[0] : 0;
            }
        },

        valueAt: function(index) {
            var content = this.get('content');
            return Em.isArray(content) ? content[index] : index;
        },

        indexOfValue: function(value) {
            return Em.isArray(this.get('content')) ? 
                this.get('content').indexOf(value) : 
                Em.isNone(value) ? this.getFloor() : value;
        },

        getAdjustedIndex: function(index, ceiling) {
            var floor = this.getFloor();
            if(index < floor) {
                while(index < floor) index = index + ceiling - floor;
                return index;
            } else if(index >= ceiling) {
                while(index >= ceiling) index = index - ceiling + floor;
                return index;
            } else {
                return index;
            }
        },

        spin: function(direction) {
            var newIndex = this.get('_selectedIndex') + (direction === 'up' ? -1 : 1),
                len = this.getCeiling();

            if(this.get('circular') === false && (newIndex < this.getFloor() || newIndex >= len)) {
                return;
            }

            this.set('_selectedIndex', this.getAdjustedIndex(newIndex, len));
            this.$rowsCt.stop(true, true);
            this.$rowsCt.animate(
                {top: (direction === 'up' ? '+' : '-') + '=' + this.get('rowHeight')},
                this.get('_scrollAnimDuration'),
                'swing',
                Em.run.bind(this, function() {
                    this.updateSelection(true);
                })
            );
        },

        throttledSpin: function(direction) {
            this.set('_throttledSpinTimer', Em.run.throttle(this, this.spin, direction, this.get('_scrollAnimDuration')));
        },

        momentumSpin: function(duration, direction, currentSpin, totalSpins) {
            this.throttledSpin(direction);
            currentSpin++;

            if(currentSpin < totalSpins) {
                var waitTime = this.easeOutQuad(currentSpin, 0, duration, totalSpins);
                this.set('_momentumScrollTimer', Em.run.later(this, this.momentumSpin, duration, direction, currentSpin, totalSpins, waitTime));
            } else {
                this.setProperties({
                    _momentumScrollTimer: null,
                    _scrollMultiplier: 1
                });
            }
        },

        easeOutQuad: function(t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        },

        handleValueChange: function() {
            var valIndex = this.indexOfValue(this.get('value'));
            this.set('_selectedIndex', valIndex === -1 ? this.getFloor() : valIndex);
            this.updateSelection();
        }.observes('value'),

        handleOptionsChange: function() {
            var valIndex = this.indexOfValue(this.get('_selected'));
            this.set('_selectedIndex', valIndex === -1 ? this.getFloor() : valIndex);
            this.updateSelection(true);
        }.observes('content', 'range'),

        handleSpinUpWhen: function() {
            if(!this.get('spinUpWhen')) return;
            this.throttledSpin('up');
            this.set('spinUpWhen', false);
        }.observes('spinUpWhen'),

        handleSpinDownWhen: function() {
            if(!this.get('spinDownWhen')) return;
            this.throttledSpin('down');
            this.set('spinDownWhen', false);
        }.observes('spinDownWhen'),

        handleTouchStart: function(e) {
            e.preventDefault();
            this.setProperties({
                _touchStartTime: e.timeStamp,
                _touchPageY: e.originalEvent.touches[0].pageY,
                _touchMoveY: false,
                _touchMoveDelta: 0
            });

            if(!Em.isNone(this.get('_momentumScrollTimer')) && (this.get('_touchStartTime') - this.get('_touchEndTime')) < this.get('_scrollAccelerationThreshold')) {
                //user swiped while still in the momentum scroll phase, increase the multiplier for the offset
                this.incrementProperty('_scrollMultiplier', this.get('_scrollAcceleration'));
            } else {
                //otherwise reset the multiplier
                this.set('_scrollMultiplier', 1);
            }
            
            if(this.get('_momentumScrollTimer')) {
                Em.run.cancel(this.get('_momentumScrollTimer'));
            }
        }.on('touchStart'),

        handleTouchMove: function(e) {
            var movePageY = e.originalEvent.touches[0].pageY,
                prevMoveY = this.get('_touchMoveY'),
                prevDelta = this.get('_touchMoveDelta'),
                startY = prevMoveY ? prevMoveY : this.get('_touchPageY'),
                newMoveDelta = prevDelta + (startY - movePageY),
                startSpin = Math.abs(newMoveDelta) > this.get('_scrollStartThreshold'),
                distance, 
                accel;

            e.preventDefault();

            this.setProperties({
                _touchMoveTime: e.timeStamp,
                _touchMoveY: movePageY,
                _touchMoveDelta: Math.abs(newMoveDelta) > this.get('_scrollStartThreshold') ? 0 : newMoveDelta,
                _startSpin: startSpin
            });

            if(this.get('_startSpin')) {
                //determine total distance moved from the touch start position
                distance = this.get('_touchPageY') - movePageY;
                //calculate acceleration during movement
                accel = Math.abs(distance / (e.timeStamp - this.get('_touchStartTime')));

                this.setProperties({
                    _touchDistance: distance,
                    _touchAccel: accel
                });

                if(this.get('_momentumScrollTimer')) {
                    Em.run.cancel(this.get('_momentumScrollTimer'));
                }

                this.throttledSpin((startY - movePageY) < 0 ? 'up' : 'down');
            }
        }.on('touchMove'),

        handleTouchEnd: function(e) {
            var multiplier, touchTime, offset, numSpins, direction, duration;
            e.preventDefault();
            this.setProperties({
                _touchEndTime: e.timeStamp,
                _touchMoveY: false,
                _touchMoveDelta: 0
            });
            
            if(this.get('_startSpin')) {
                multiplier = this.get('_scrollMultiplier');
                touchTime = e.timeStamp - this.get('_touchMoveTime');
                offset = Math.pow(this.get('_touchAccel'), 2) * this.get('height');
                if(offset > this.get('maxScrollOffset')) offset = this.get('maxScrollOffset');
                offset = (this.get('_touchDistance') < 0) ? -multiplier * offset : multiplier * offset;

                if(this.get('_momentumScrollTimer')) {
                    Em.run.cancel(this.get('_momentumScrollTimer'));
                }

                //based on the distance and speed of the swipe, calculate and execute the momentum phase of the scroll
                if(touchTime < this.get('_swipeMoveThreshold') && offset !== 0 && Math.abs(offset) > this.get('_swipeOffsetThreshold')) {
                    duration = this.get('scrollDuration');
                    numSpins = Math.ceil((this.get('_touchDistance') + offset) / this.get('_scrollStartThreshold'));
                    direction = numSpins < 0 ? 'up' : 'down';
                    this.momentumSpin(duration, direction, 0, Math.abs(numSpins));
                }
            }
        }.on('touchEnd'),

        handleKeyDown: function(e) {
            if(e.keyCode != 38 && e.keyCode != 40) return;
            e.preventDefault();
            this.throttledSpin(e.keyCode == 38 ? 'up' : 'down');
        }.on('keyDown'),

        handleMouseWheel: function(e) {
            var origEvent = e.originalEvent;
            e.preventDefault();
            this.throttledSpin((origEvent.wheelDelta > 0 || origEvent.detail < 0) ? 'up' : 'down');
        },

        actions: {
            rowClick: function(rowValue) {
                this.set('_selectedIndex', this.indexOfValue(rowValue));
                this.updateSelection(true);
            }
        }
    });

    Ember.Handlebars.helper('spin-box', SpinBoxComponent);
})(this);
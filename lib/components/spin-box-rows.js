App.SpinBoxRowsView = Ember.ContainerView.extend({
    classNames: ['spinbox-rows'],

    setup: function() {
        this.$el = this.$();
        this.get('parentView').registerRowsView(this);
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

    disableTransitions: function() {
        this.$el.css({
            '-webkit-transition': '',
            '-moz-transition': '',
            '-ms-transition': '',
            '-o-transition': '',
            'transition': ''
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
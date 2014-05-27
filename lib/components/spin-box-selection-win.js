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
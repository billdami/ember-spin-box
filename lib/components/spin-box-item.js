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
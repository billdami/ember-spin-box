App.SpinBoxItemComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile('{{value}}'),
    classNames: ['spinbox-row'],
    classNameBindings: ['selected'],
    attributeBindings: ['style'],

    style: function() {
        return 'top:' + this.get('top') + 'px';
    }.property('top')
});
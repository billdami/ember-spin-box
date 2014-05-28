App.SpinBoxRowComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile('{{value}}'),
    classNames: ['spinbox-row'],
    classNameBindings: ['selected'],
    attributeBindings: ['style'],

    selected: function() {
        return this.get('index') === this.get('parentView.parentView._selectedIndex');
    }.property('index', 'parentView.parentView._selectedIndex'),

    style: function() {
        return 'top:' + this.get('top') + 'px';
    }.property('top'),

    handleClick: function() {
        var selectedRow = this.get('parentView').findBy('selected', true);
        
        if(selectedRow && this.get('value') && !this.get('selected')) {
            this.get('parentView.parentView').spin(selectedRow.get('top') - this.get('top'), true);
        }
    }.on('click')
});
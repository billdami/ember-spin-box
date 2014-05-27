var App = Ember.Application.create({});

App.ApplicationController = Ember.ObjectController.extend({
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    spinboxValue: 3
});
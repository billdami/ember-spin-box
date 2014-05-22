var App = Ember.Application.create({
    LOG_MODULE_RESOLVER: true,
    LOG_TRANSITIONS: true,
    LOG_VIEW_LOOKUPS: true
});

App.ApplicationController = Ember.ObjectController.extend({
    basicExampleValue: "banana",
    selectedMonth: "January",
    selectedDay: "26",
    selectedYear: 2014,
    selectedHour: "3",
    selectedMinute: "45",
    selectedPeriod: "PM",
    selectedMonth2: "July",
    selectedDay2: "4",
    selectedYear2: 2015,
    selectedMonth3: "December",
    selectedDay3: "25",
    selectedYear3: 1985,

    basicExampleContent: ['apple', 'orange', 'banana', 'pear', 'pineapple', 'peach', 'plum', 'grape', 'mango', 'apricot'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    hours: ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
    clockPeriods: ['AM', 'PM'],
    yearRange: [1900, 2025],
    btnsExampleRange: [1, 100],

    spinEx1Up: false,
    spinEx1Down: false,
    spinEx2Up: false,
    spinEx2Down: false,
    spinEx3Up: false,
    spinEx3Down: false,

    selectedDate: function() {
        return this.get('selectedMonth') + ' ' +
            this.get('selectedDay') + ', ' +
            this.get('selectedYear') + ' ' +
            this.get('selectedHour') + ':' +
            this.get('selectedMinute') + ' ' +
            this.get('selectedPeriod');
    }.property('selectedMonth', 'selectedDay', 'selectedYear', 'selectedHour', 'selectedMinute', 'selectedPeriod'),

    days: function() {
        return this.getDays(this.get('selectedMonth'), this.get('selectedYear'));
    }.property('selectedMonth', 'selectedYear'),

    days2: function() {
        return this.getDays(this.get('selectedMonth2'), this.get('selectedYear2'));
    }.property('selectedMonth2', 'selectedYear2'),

    days3: function() {
        return this.getDays(this.get('selectedMonth3'), this.get('selectedYear3'));
    }.property('selectedMonth3', 'selectedYear3'),

    years: function() {
        var years = [];
        for(var i=1900; i<=2050; i++) {
            years.push(i.toString());
        }

        return years;
    }.property(),

    minutes: function() {
        var minutes = [];
        for(var i=0; i<=60; i++) {
            var padded = "0" + i.toString();
            minutes.push(padded.substr(padded.length - 2));
        }

        return minutes;
    }.property(),

    getDays: function(month, year) {
        var days = [],
            daysInMonth = 32 - (new Date(year, this.get('months').indexOf(month), 32).getDate());

        for(var i=1; i<=daysInMonth; i++) {
            days.push(i.toString());
        }

        return days;
    },

    actions: {
        spinnerUpdated: function(selection, index) {
            //console.log('selected: ' + selection + ' (' + index + ')');
        },

        spin: function(target, direction) {
            this.set('spin' + target + (direction === 'up' ? 'Up' : 'Down'), true);
        }
    }
});
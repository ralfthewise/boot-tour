(function() {
  var $, BootTour,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  $ = jQuery;

  BootTour = (function() {

    BootTour.prototype.defaults = {
      allowrestart: false,
      placement: 'right',
      scrollSpeed: 300,
      timer: 0,
      nextbutton: true,
      skipbutton: true,
      spotlight: false,
      spotlightopacity: 0.6,
      spotlightradius: 250,
      spotlighttransitionsteps: 10,
      spotlighttransitiontime: 1,
      animation: true,
      cookieMonster: true,
      cookieName: 'boottour',
      cookieDomain: false,
      container: 'body',
      pretourcallback: null,
      prestepcallback: null,
      poststepcallback: null,
      posttourcallback: null
    };

    function BootTour($el, options) {
      this.runPreviousStep = __bind(this.runPreviousStep, this);
      this.runNextStep = __bind(this.runNextStep, this);
      this.finishTour = __bind(this.finishTour, this);
      this.startTour = __bind(this.startTour, this);      this.$el = $el;
      this.tourStarted = false;
      this.stepOpen = false;
      this.tourOptions = $.extend({}, this.defaults, this.$el.data(), options);
      this.$el.on('bootTourDestroyed', this.finishTour);
    }

    BootTour.prototype.startTour = function() {
      if (this.tourStarted && this.tourOptions.allowrestart) this.finishTour();
      if (!this.tourStarted) {
        this.tourStarted = true;
        if (this.tourOptions.pretourcallback != null) {
          $.extend(this.tourOptions, this.tourOptions.pretourcallback.call(this.$el, this.$el));
        }
        this.$stepEls = this.$el.find('li');
        this.currentStepIndex = this._determineStartIndex();
        return this.runNextStep();
      }
    };

    BootTour.prototype.finishTour = function() {
      var _ref;
      if (this.tourStarted) {
        this.tourStarted = false;
        this._finishCurrentStep();
        this._hideSpotlight();
        return (_ref = this.tourOptions.posttourcallback) != null ? _ref.call(this.$el, this.$el) : void 0;
      }
    };

    BootTour.prototype.runNextStep = function() {
      if (this._finishCurrentStep()) this.currentStepIndex++;
      if (this.currentStepIndex >= this.$stepEls.length) {
        return this.finishTour();
      } else {
        return this._runStep();
      }
    };

    BootTour.prototype.runPreviousStep = function() {
      if (this._finishCurrentStep()) this.currentStepIndex--;
      if (this.currentStepIndex < 0) {
        return this.finishTour();
      } else {
        return this._runStep();
      }
    };

    BootTour.prototype._runStep = function() {
      var stepContent, _ref;
      this.$stepEl = $(this.$stepEls[this.currentStepIndex]);
      this.stepOptions = $.extend({}, this.tourOptions, this.$stepEl.data());
      if (this.tourOptions.prestepcallback != null) {
        $.extend(this.stepOptions, this.tourOptions.prestepcallback.call(this.$stepEl, this.$stepEl));
      }
      this.$stepTarget = (_ref = this.stepOptions.$target) != null ? _ref : $(this.stepOptions.target);
      if (!(this.$stepTarget && this.$stepTarget.length > 0)) {
        throw new Error("Unable to locate 'target' element for step " + (index + 1));
      }
      stepContent = this._generateStepContent(this.$stepEl, this.stepOptions);
      this._updateSpotlight();
      this.$stepTarget.popover({
        trigger: 'manual',
        placement: this.stepOptions.placement,
        container: this.stepOptions.container,
        animation: this.stepOptions.animation,
        title: this.stepOptions.title,
        content: stepContent,
        html: true
      });
      this.$stepTarget.popover('show');
      $('.tour-tip-next').on('click', this.runNextStep);
      return this.stepOpen = true;
    };

    BootTour.prototype._finishCurrentStep = function() {
      var _ref;
      if (this.stepOpen) {
        this.stepOpen = false;
        $('.tour-tip-next').off('click', this.runNextStep);
        this.$stepTarget.popover('hide');
        if (((_ref = this.tourOptions.poststepcallback) != null ? _ref.call(this.$stepEl, this.$stepEl) : void 0) === false) {
          this.finishTour();
          return false;
        }
        return true;
      } else {
        return false;
      }
    };

    BootTour.prototype._updateSpotlight = function() {
      var $spotlight, currentStep, interval, oldSettings,
        _this = this;
      if (this.stepOptions.spotlight) {
        $spotlight = $('.boot-tour-spotlight');
        if (($spotlight != null) && $spotlight.length > 0) {
          oldSettings = $.extend({}, this.spotlightSettings);
          this.spotlightSettings = this._collectSpotlightSettings();
          currentStep = 1;
          return interval = setInterval(function() {
            _this._updateIncrementalSpotlight($spotlight, currentStep, oldSettings, _this.spotlightSettings);
            currentStep++;
            if (currentStep >= _this.stepOptions.spotlighttransitionsteps) {
              return clearInterval(interval);
            }
          }, this.stepOptions.spotlighttransitiontime);
        } else {
          this.spotlightSettings = this._collectSpotlightSettings();
          $spotlight = $('<div class="boot-tour-spotlight"><div class="boot-tour-spotlight-inner"></div></div>');
          this._applySpotlightSettings($spotlight, this.spotlightSettings);
          return $spotlight.appendTo('body');
        }
      } else {
        return this._hideSpotlight();
      }
    };

    BootTour.prototype._collectSpotlightSettings = function() {
      var elOffset, left, spotlightSettings, top;
      elOffset = this.$stepTarget.offset();
      top = elOffset.top + (this.$stepTarget.height() / 2) - this.stepOptions.spotlightradius;
      left = elOffset.left + (this.$stepTarget.width() / 2) - this.stepOptions.spotlightradius;
      spotlightSettings = {
        'top': top,
        'left': left,
        'opacity': this.stepOptions.spotlightopacity,
        'outerWidth': this.stepOptions.spotlightradius * 2,
        'outerHeight': this.stepOptions.spotlightradius * 2,
        'outerRadius': this.stepOptions.spotlightradius,
        'innerWidth': (this.stepOptions.spotlightradius * 2) + 4,
        'innerHeight': (this.stepOptions.spotlightradius * 2) + 4,
        'innerRadius': this.stepOptions.spotlightradius + 2
      };
      return spotlightSettings;
    };

    BootTour.prototype._updateIncrementalSpotlight = function($spotlight, currentStep, oldSettings, newSettings) {
      var currentSettings, ratio;
      if (currentStep <= this.stepOptions.spotlighttransitionsteps) {
        ratio = currentStep / this.stepOptions.spotlighttransitionsteps;
        currentSettings = {
          'top': oldSettings.top + ((newSettings.top - oldSettings.top) * ratio),
          'left': oldSettings.left + ((newSettings.left - oldSettings.left) * ratio),
          'opacity': oldSettings.opacity + ((newSettings.opacity - oldSettings.opacity) * ratio),
          'outerWidth': oldSettings.outerWidth + ((newSettings.outerWidth - oldSettings.outerWidth) * ratio),
          'outerHeight': oldSettings.outerHeight + ((newSettings.outerHeight - oldSettings.outerHeight) * ratio),
          'outerRadius': oldSettings.outerRadius + ((newSettings.outerRadius - oldSettings.outerRadius) * ratio),
          'innerWidth': oldSettings.innerWidth + ((newSettings.innerWidth - oldSettings.innerWidth) * ratio),
          'innerHeight': oldSettings.innerHeight + ((newSettings.innerHeight - oldSettings.innerHeight) * ratio),
          'innerRadius': oldSettings.innerRadius + ((newSettings.innerRadius - oldSettings.innerRadius) * ratio)
        };
        return this._applySpotlightSettings($spotlight, currentSettings);
      }
    };

    BootTour.prototype._applySpotlightSettings = function($spotlight, settings) {
      var innerOptions, outerOptions;
      outerOptions = {
        'top': "" + settings.top + "px",
        'left': "" + settings.left + "px",
        'width': "" + settings.outerWidth + "px",
        'height': "" + settings.outerHeight + "px",
        'opacity': settings.opacity,
        'border-radius': "" + settings.outerRadius + "px",
        '-webkit-border-radius': "" + settings.outerRadius + "px",
        '-moz-border-radius': "" + settings.outerRadius + "px"
      };
      innerOptions = {
        'width': "" + settings.innerWidth + "px",
        'height': "" + settings.innerHeight + "px",
        'border-radius': "" + settings.innerRadius + "px",
        '-webkit-border-radius': "" + settings.innerRadius + "px",
        '-moz-border-radius': "" + settings.innerRadius + "px"
      };
      $spotlight.css(outerOptions);
      return $spotlight.find('.boot-tour-spotlight-inner').css(innerOptions);
    };

    BootTour.prototype._hideSpotlight = function() {
      return $('.boot-tour-spotlight').remove();
    };

    BootTour.prototype._determineStartIndex = function() {
      return 0;
    };

    BootTour.prototype._generateStepContent = function() {
      return "<p>" + (this.$stepEl.html()) + "</p>\n<p style=\"text-align: right\">\n  <button class=\"tour-tip-next btn btn-primary\">\n    " + ((this.currentStepIndex + 1) < this.$stepEls.length ? 'Next <i class="icon-chevron-right icon-white"></i>' : '<i class="icon-ok icon-white"></i> Done') + "\n  </button>\n</p>";
    };

    return BootTour;

  })();

  $.fn.extend({
    boottour: function(option) {
      return this.each(function() {
        var $el, data, options;
        options = typeof option === 'object' && option;
        $el = $(this);
        data = $el.data('boottour');
        if (!data) $el.data('boottour', (data = new BootTour($el, options)));
        if (typeof option === 'string') {
          switch (option) {
            case 'start':
              return data.startTour();
            case 'finish':
              return data.finishTour();
            case 'next':
              return data.runNextStep();
            case 'previous':
              return data.runPreviousStep();
          }
        }
      });
    }
  });

  $.event.special.bootTourDestroyed = {
    remove: function(o) {
      var _ref;
      return (_ref = o.handler) != null ? _ref.apply(this, arguments) : void 0;
    }
  };

}).call(this);

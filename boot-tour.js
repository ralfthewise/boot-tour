(function() {
  var $, BootTour,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  $ = jQuery;

  BootTour = (function() {

    BootTour.prototype.defaults = {
      allowrestart: false,
      placement: 'right',
      offset: 0,
      scrollSpeed: 300,
      timer: 0,
      startstep: null,
      nextbutton: true,
      previousbutton: false,
      skipbutton: false,
      spotlight: false,
      spotlightopacity: 0.6,
      spotlightradius: 250,
      spotlighttransitionsteps: 10,
      spotlighttransitiontime: 1,
      animation: true,
      cookie: 'boottour',
      cookiedomain: false,
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
      this.completeTour = __bind(this.completeTour, this);
      this.startTour = __bind(this.startTour, this);      this.$el = $el;
      this.tourStarted = false;
      this.stepOpen = false;
      this.$el.on('bootTourDestroyed', this.finishTour);
    }

    BootTour.prototype.setOptions = function(options) {
      return this.tourOptions = $.extend({}, this.defaults, this.$el.data(), this.tourOptions, options);
    };

    BootTour.prototype.startTour = function() {
      if (this.tourStarted && this.tourOptions.allowrestart) this.finishTour();
      if (!this.tourStarted) {
        if (this.tourOptions.pretourcallback != null) {
          $.extend(this.tourOptions, this.tourOptions.pretourcallback.call(this.$el, this.$el));
        }
        this.$stepEls = this.$el.find('li');
        this.currentStepIndex = this._determineStartIndex();
        if (this.currentStepIndex >= this.$stepEls.length) return;
        this.tourStarted = true;
        $(document).on('click.boottour', '.boot-tour-skip-btn', this.completeTour);
        $(document).on('click.boottour', '.boot-tour-previous-btn', this.runPreviousStep);
        $(document).on('click.boottour', '.boot-tour-next-btn', this.runNextStep);
        return this.runNextStep();
      }
    };

    BootTour.prototype.completeTour = function() {
      this._storeState(this.$stepEls.length);
      return this.finishTour();
    };

    BootTour.prototype.finishTour = function() {
      var _ref;
      if (this.tourStarted) {
        this.tourStarted = false;
        $(document).off('click.boottour', '.boot-tour-skip-btn', this.finishTour);
        $(document).off('click.boottour', '.boot-tour-previous-btn', this.runPreviousStep);
        $(document).off('click.boottour', '.boot-tour-next-btn', this.runNextStep);
        this._finishCurrentStep();
        this._hideSpotlight();
        this.currentStepIndex = 0;
        return (_ref = this.tourOptions.posttourcallback) != null ? _ref.call(this.$el, this.$el) : void 0;
      }
    };

    BootTour.prototype.runNextStep = function() {
      if (this.tourStarted) {
        if (this._finishCurrentStep()) this.currentStepIndex++;
        if (this.currentStepIndex >= this.$stepEls.length) {
          return this.completeTour();
        } else {
          return this._runStep();
        }
      }
    };

    BootTour.prototype.runPreviousStep = function() {
      if (this.tourStarted) {
        if (this._finishCurrentStep()) this.currentStepIndex--;
        if (this.currentStepIndex < 0) {
          return this.finishTour();
        } else {
          return this._runStep();
        }
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
      this._setTooltipOffset();
      if (this.stepOptions.timer > 0) {
        this.timeout = setTimeout(this.runNextStep, this.stepOptions.timer);
      }
      this._storeState(this.currentStepIndex);
      return this.stepOpen = true;
    };

    BootTour.prototype._setTooltipOffset = function() {
      var offsetOptions;
      if (this.stepOptions.offset !== 0) {
        offsetOptions = {};
        switch (this.stepOptions.placement) {
          case 'top':
            offsetOptions['margin-top'] = -this.stepOptions.offset;
            break;
          case 'right':
            offsetOptions['margin-left'] = this.stepOptions.offset;
            break;
          case 'bottom':
            offsetOptions['margin-top'] = this.stepOptions.offset;
            break;
          case 'left':
            offsetOptions['margin-left'] = -this.stepOptions.offset;
        }
        return $(".popover." + this.stepOptions.placement).css(offsetOptions);
      }
    };

    BootTour.prototype._finishCurrentStep = function() {
      var _ref;
      if (this.stepOpen) {
        if (this.timeout != null) {
          clearTimeout(this.timeout);
          delete this.timeout;
        }
        this.stepOpen = false;
        this.$stepTarget.popover('hide');
        this.$stepTarget.popover('destroy');
        if (((_ref = this.tourOptions.poststepcallback) != null ? _ref.call(this.$stepEl, this.$stepEl) : void 0) === false) {
          this.finishTour();
          return false;
        }
        return true;
      } else {
        return false;
      }
    };

    BootTour.prototype._storeState = function() {
      var cookieOptions;
      if (($.cookie != null) && !!this.tourOptions.cookie) {
        cookieOptions = {
          expires: 3650,
          path: '/'
        };
        if (this.tourOptions.cookiedomain) {
          cookieOptions.domain = this.tourOptions.cookiedomain;
        }
        return $.cookie(this.tourOptions.cookie, this.currentStepIndex, cookieOptions);
      }
    };

    BootTour.prototype._readState = function() {
      if (($.cookie != null) && !!this.tourOptions.cookie) {
        return $.cookie(this.tourOptions.cookie);
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

    BootTour.prototype._generateStepContent = function() {
      var $content, doneHtml, nextHtml, previousHtml, skipHtml;
      $content = $(this.tooltipTemplate);
      $content.find('.boot-tour-main-content').html(this.$stepEl.html());
      if (this.stepOptions.skipbutton) {
        skipHtml = this.skipButtonTemplate;
        $content.find('.boot-tour-skip-btn').html(skipHtml);
      }
      if (this.stepOptions.nextbutton) {
        if ((this.currentStepIndex + 1) < this.$stepEls.length) {
          nextHtml = this.nextButtonTemplate;
          $content.find('.boot-tour-next-btn').html(nextHtml);
        } else {
          doneHtml = this.doneButtonTemplate;
          $content.find('.boot-tour-next-btn').html(doneHtml);
        }
      }
      if (this.stepOptions.previousbutton && this.currentStepIndex > 0) {
        previousHtml = this.previousButtonTemplate;
        $content.find('.boot-tour-previous-btn').html(previousHtml);
      }
      return $content.html();
    };

    BootTour.prototype._determineStartIndex = function() {
      var index;
      index = this._generateResult(this.tourOptions, 'startstep');
      if (!index && index !== 0) index = this._readState() || 0;
      return index;
    };

    BootTour.prototype._generateResult = function(object, attribute) {
      if (typeof object[attribute] === 'function') {
        return object[attribute].call(this.$el);
      } else {
        return object[attribute];
      }
    };

    BootTour.prototype.tooltipTemplate = "<div>\n  <p class=\"boot-tour-main-content\"></p>\n  <p style=\"text-align: right\">\n    <span class=\"boot-tour-skip-btn\"></span>\n    <span class=\"boot-tour-previous-btn\"></span>\n    <span class=\"boot-tour-next-btn\"></span>\n  </p>\n</div>";

    BootTour.prototype.skipButtonTemplate = '<button class="btn btn-danger"><i class="icon-remove-circle icon-white"></i> Skip Tour</button>';

    BootTour.prototype.nextButtonTemplate = '<button class="btn btn-primary">Next <i class="icon-chevron-right icon-white"></i></button>';

    BootTour.prototype.doneButtonTemplate = '<button class="btn btn-primary"><i class="icon-ok icon-white"></i> Done</button>';

    BootTour.prototype.previousButtonTemplate = '<button class="btn btn-primary"><i class="icon-chevron-left icon-white"></i> Previous</button>';

    return BootTour;

  })();

  $.fn.extend({
    boottour: function(action, option) {
      return this.each(function() {
        var $el, data, options;
        options = typeof option === 'object' && option;
        if (options == null) options = typeof action === 'object' && action;
        $el = $(this);
        data = $el.data('boottour');
        if (!data) $el.data('boottour', (data = new BootTour($el)));
        data.setOptions(options);
        if (typeof action === 'string') {
          switch (action) {
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

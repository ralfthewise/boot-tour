$ = jQuery

class BootTour
  defaults:
    allowrestart: false           # will tour restart if currently running tour isn't finished
    placement: 'right'            # top/right/bottom/left
    scrollSpeed: 300              # Page scrolling speed in ms
    timer: 0                      # 0 = off, all other numbers = time(ms)
    nextbutton: true              # true/false for next button visibility
    skipbutton: true              # true/false for skip button visibility
    spotlight: false              # whether or not to show the spotlight on the element
    spotlightopacity: 0.6         # opacity
    spotlightradius: 250          # radius in pixels
    spotlighttransitionsteps: 10  # number of steps to take to perform spotlight transitions
    spotlighttransitiontime: 1   # time for each step
    animation: true               # whether or not to apply animation to tooltip
    cookieMonster: true           # true/false for whether cookies are used
    cookieName: 'boottour'        # choose your own cookie name
    cookieDomain: false           # set to false or yoursite.com
    container: 'body'             # where the tip be attached if not inline
    pretourcallback: null         # a method to call before the tour starts - return value will be merged with the tour options
    prestepcallback: null         # a method to call before each step - should return an object that will be merged with the current step options
    poststepcallback: null        # a method to call after each step - if it returns false tour stops
    posttourcallback: null        # a method to call once the tour closes

  constructor: ($el, options) ->
    @$el = $el
    @tourStarted = false
    @stepOpen = false
    @tourOptions = $.extend({}, @defaults, @$el.data(), options)
    @$el.on('bootTourDestroyed', @finishTour)

  startTour: () =>
    @finishTour() if @tourStarted and @tourOptions.allowrestart

    unless @tourStarted
      @tourStarted = true
      if @tourOptions.pretourcallback?
        $.extend(@tourOptions, @tourOptions.pretourcallback.call(@$el, @$el))
      @$stepEls = @$el.find('li')
      @currentStepIndex = @_determineStartIndex()
      @runNextStep()

  finishTour: () =>
    if @tourStarted
      @tourStarted = false
      @_finishCurrentStep()
      @_hideSpotlight()
      @tourOptions.posttourcallback?.call(@$el, @$el)

  runNextStep: () =>
    @currentStepIndex++ if @_finishCurrentStep()

    if @currentStepIndex >= @$stepEls.length
      @finishTour()
    else
      @_runStep()

  runPreviousStep: () =>
    @currentStepIndex-- if @_finishCurrentStep()

    if @currentStepIndex < 0
      @finishTour()
    else
      @_runStep()

  _runStep: () ->
    @$stepEl = $(@$stepEls[@currentStepIndex])
    @stepOptions = $.extend({}, @tourOptions, @$stepEl.data())
    if @tourOptions.prestepcallback?
      $.extend(@stepOptions, @tourOptions.prestepcallback.call(@$stepEl, @$stepEl))
    @$stepTarget = @stepOptions.$target ? $(@stepOptions.target)
    throw new Error("Unable to locate 'target' element for step #{index + 1}") unless @$stepTarget and @$stepTarget.length > 0

    stepContent = @_generateStepContent(@$stepEl, @stepOptions)
    @_updateSpotlight()
    @$stepTarget.popover(
      trigger: 'manual'
      placement: @stepOptions.placement
      container: @stepOptions.container
      animation: @stepOptions.animation
      title: @stepOptions.title
      content: stepContent
      html: true
    )
    @$stepTarget.popover('show')
    $('.tour-tip-next').on('click', @runNextStep)
    @stepOpen = true

  _finishCurrentStep: () ->
    if @stepOpen
      @stepOpen = false
      $('.tour-tip-next').off('click', @runNextStep)
      @$stepTarget.popover('hide')
      if @tourOptions.poststepcallback?.call(@$stepEl, @$stepEl) == false
        @finishTour()
        return false
      return true
    else
      return false

  _updateSpotlight: () ->
    if @stepOptions.spotlight
      $spotlight = $('.boot-tour-spotlight')
      if $spotlight? and $spotlight.length > 0
        oldSettings = $.extend({}, @spotlightSettings)
        @spotlightSettings = @_collectSpotlightSettings()
        currentStep = 1
        interval = setInterval(() =>
          @_updateIncrementalSpotlight($spotlight, currentStep, oldSettings, @spotlightSettings)
          currentStep++
          clearInterval(interval) if currentStep >= @stepOptions.spotlighttransitionsteps
        , @stepOptions.spotlighttransitiontime)
      else
        @spotlightSettings = @_collectSpotlightSettings()
        $spotlight = $('<div class="boot-tour-spotlight"><div class="boot-tour-spotlight-inner"></div></div>')
        @_applySpotlightSettings($spotlight, @spotlightSettings)
        $spotlight.appendTo('body')
    else
      @_hideSpotlight()

  _collectSpotlightSettings: () ->
    elOffset = @$stepTarget.offset()
    top = elOffset.top + (@$stepTarget.height() / 2) - @stepOptions.spotlightradius
    left = elOffset.left + (@$stepTarget.width() / 2) - @stepOptions.spotlightradius
    spotlightSettings =
      'top': top
      'left': left
      'opacity': @stepOptions.spotlightopacity
      'outerWidth': @stepOptions.spotlightradius * 2
      'outerHeight': @stepOptions.spotlightradius * 2
      'outerRadius': @stepOptions.spotlightradius
      'innerWidth': (@stepOptions.spotlightradius * 2) + 4
      'innerHeight': (@stepOptions.spotlightradius * 2) + 4
      'innerRadius': @stepOptions.spotlightradius + 2
    return spotlightSettings

  _updateIncrementalSpotlight: ($spotlight, currentStep, oldSettings, newSettings) ->
    if currentStep <= @stepOptions.spotlighttransitionsteps
      ratio = currentStep / @stepOptions.spotlighttransitionsteps
      currentSettings =
        'top': oldSettings.top + ((newSettings.top - oldSettings.top) * ratio)
        'left': oldSettings.left + ((newSettings.left - oldSettings.left) * ratio)
        'opacity': oldSettings.opacity + ((newSettings.opacity - oldSettings.opacity) * ratio)
        'outerWidth': oldSettings.outerWidth + ((newSettings.outerWidth - oldSettings.outerWidth) * ratio)
        'outerHeight': oldSettings.outerHeight + ((newSettings.outerHeight - oldSettings.outerHeight) * ratio)
        'outerRadius': oldSettings.outerRadius + ((newSettings.outerRadius - oldSettings.outerRadius) * ratio)
        'innerWidth': oldSettings.innerWidth + ((newSettings.innerWidth - oldSettings.innerWidth) * ratio)
        'innerHeight': oldSettings.innerHeight + ((newSettings.innerHeight - oldSettings.innerHeight) * ratio)
        'innerRadius': oldSettings.innerRadius + ((newSettings.innerRadius - oldSettings.innerRadius) * ratio)
      @_applySpotlightSettings($spotlight, currentSettings)

  _applySpotlightSettings: ($spotlight, settings) ->
    outerOptions =
      'top': "#{settings.top}px"
      'left': "#{settings.left}px"
      'width': "#{settings.outerWidth}px"
      'height': "#{settings.outerHeight}px"
      'opacity': settings.opacity
      'border-radius': "#{settings.outerRadius}px"
      '-webkit-border-radius': "#{settings.outerRadius}px"
      '-moz-border-radius': "#{settings.outerRadius}px"
    innerOptions =
      'width': "#{settings.innerWidth}px"
      'height': "#{settings.innerHeight}px"
      'border-radius': "#{settings.innerRadius}px"
      '-webkit-border-radius': "#{settings.innerRadius}px"
      '-moz-border-radius': "#{settings.innerRadius}px"
    $spotlight.css(outerOptions)
    $spotlight.find('.boot-tour-spotlight-inner').css(innerOptions)

  _hideSpotlight: () ->
    $('.boot-tour-spotlight').remove()

  _determineStartIndex: () ->
    0

  _generateStepContent: () ->
    return """
      <p>#{@$stepEl.html()}</p>
      <p style="text-align: right">
        <button class="tour-tip-next btn btn-primary">
          #{if (@currentStepIndex + 1) < @$stepEls.length then 'Next <i class="icon-chevron-right icon-white"></i>' else '<i class="icon-ok icon-white"></i> Done'}
        </button>
      </p>
    """

$.fn.extend
  boottour: (option) ->
    @each () ->
      options = typeof option == 'object' and option
      $el = $(@)
      data = $el.data('boottour')
      $el.data('boottour', (data = new BootTour($el, options))) unless data
      if typeof option == 'string'
        switch option
          when 'start' then data.startTour()
          when 'finish' then data.finishTour()
          when 'next' then data.runNextStep()
          when 'previous' then data.runPreviousStep()

#provide our custom remove event so we can close tour if 'ol' element is removed from DOM
$.event.special.bootTourDestroyed =
  remove: (o) ->
    o.handler?.apply(@, arguments)

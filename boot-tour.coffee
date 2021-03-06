$ = jQuery

class BootTour
  defaults:
    allowrestart: false           # will tour restart if currently running tour isn't finished
    placement: 'right'            # top/right/bottom/left
    offset: 0                     # offset (in pixels) tooltip is shifted from element it is attached to
    scrollSpeed: 300              # Page scrolling speed in ms
    timer: 0                      # 0 = off, all other numbers = time(ms)
    startstep: null               # integer (0 based) step to start on (can be a callback as well)
    nextbutton: true              # true/false for next button visibility
    previousbutton: false         # true/false for previous button visibility
    skipbutton: false             # true/false for skip button visibility
    spotlight: false              # whether or not to show the spotlight on the element
    spotlightopacity: 0.6         # opacity
    spotlightradius: 250          # radius in pixels
    spotlighttransitionsteps: 10  # number of steps to take to perform spotlight transitions
    spotlighttransitiontime: 1    # time for each step
    animation: true               # whether or not to apply animation to tooltip
    cookie: 'boottour'            # choose your own cookie name
    cookiedomain: false           # set to false or yoursite.com
    container: 'body'             # where the tip be attached if not inline
    pretourcallback: null         # a method to call before the tour starts - return value will be merged with the tour options
    prestepcallback: null         # a method to call before each step - should return an object that will be merged with the current step options
    poststepcallback: null        # a method to call after each step - if it returns false tour stops
    posttourcallback: null        # a method to call once the tour closes

  constructor: ($el, options) ->
    @$el = $el
    @tourStarted = false
    @stepOpen = false
    @$el.on('bootTourDestroyed', @finishTour)

  setOptions: (options) ->
    @tourOptions = $.extend({}, @defaults, @$el.data(), @tourOptions, options)

  startTour: () =>
    @finishTour() if @tourStarted and @tourOptions.allowrestart

    unless @tourStarted
      if @tourOptions.pretourcallback?
        $.extend(@tourOptions, @tourOptions.pretourcallback.call(@$el, @$el))
      @$stepEls = @$el.find('li')
      @currentStepIndex = @_determineStartIndex()
      return if @currentStepIndex >= @$stepEls.length
      @tourStarted = true
      $(document).on('click.boottour', '.boot-tour-skip-btn', @completeTour)
      $(document).on('click.boottour', '.boot-tour-previous-btn', @runPreviousStep)
      $(document).on('click.boottour', '.boot-tour-next-btn', @runNextStep)
      @runNextStep()

  completeTour: () =>
    @_storeState(@$stepEls.length)
    @finishTour()

  finishTour: () =>
    if @tourStarted
      @tourStarted = false
      $(document).off('click.boottour', '.boot-tour-skip-btn', @finishTour)
      $(document).off('click.boottour', '.boot-tour-previous-btn', @runPreviousStep)
      $(document).off('click.boottour', '.boot-tour-next-btn', @runNextStep)
      @_finishCurrentStep()
      @_hideSpotlight()
      @currentStepIndex = 0
      @tourOptions.posttourcallback?.call(@$el, @$el)

  runNextStep: () =>
    if @tourStarted
      @currentStepIndex++ if @_finishCurrentStep()

      if @currentStepIndex >= @$stepEls.length
        @completeTour()
      else
        @_runStep()

  runPreviousStep: () =>
    if @tourStarted
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
    @_setTooltipOffset()
    @timeout = setTimeout(@runNextStep, @stepOptions.timer) if @stepOptions.timer > 0
    @_storeState(@currentStepIndex)
    @stepOpen = true

  _setTooltipOffset: () ->
    if @stepOptions.offset != 0
      offsetOptions = {}
      switch @stepOptions.placement
        when 'top' then offsetOptions['margin-top'] = -@stepOptions.offset
        when 'right' then offsetOptions['margin-left'] = @stepOptions.offset
        when 'bottom' then offsetOptions['margin-top'] = @stepOptions.offset
        when 'left' then offsetOptions['margin-left'] = -@stepOptions.offset
      $(".popover.#{@stepOptions.placement}").css(offsetOptions)

  _finishCurrentStep: () ->
    if @stepOpen
      if @timeout?
        clearTimeout(@timeout)
        delete @timeout
      @stepOpen = false
      @$stepTarget.popover('hide')
      @$stepTarget.popover('destroy')
      if @tourOptions.poststepcallback?.call(@$stepEl, @$stepEl) == false
        @finishTour()
        return false
      return true
    else
      return false

  _storeState: () ->
    if $.cookie? and !!@tourOptions.cookie
      cookieOptions = {expires: 3650, path: '/'}
      cookieOptions.domain = @tourOptions.cookiedomain if @tourOptions.cookiedomain
      $.cookie(@tourOptions.cookie, @currentStepIndex, cookieOptions)

  _readState: () ->
    if $.cookie? and !!@tourOptions.cookie
      return $.cookie(@tourOptions.cookie)

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

  _generateStepContent: () ->
    $content = $(@tooltipTemplate)
    $content.find('.boot-tour-main-content').html(@$stepEl.html())
    if @stepOptions.skipbutton
      skipHtml = @skipButtonTemplate
      $content.find('.boot-tour-skip-btn').html(skipHtml)
    if @stepOptions.nextbutton
      if (@currentStepIndex + 1) < @$stepEls.length
        nextHtml = @nextButtonTemplate
        $content.find('.boot-tour-next-btn').html(nextHtml)
      else
        doneHtml = @doneButtonTemplate
        $content.find('.boot-tour-next-btn').html(doneHtml)
    if @stepOptions.previousbutton and @currentStepIndex > 0
      previousHtml = @previousButtonTemplate
      $content.find('.boot-tour-previous-btn').html(previousHtml)

    return $content.html()

  _determineStartIndex: () ->
    index = @_generateResult(@tourOptions, 'startstep')
    index = (@_readState() or 0) if not index and index isnt 0
    return index

  _generateResult: (object, attribute) ->
    return if typeof object[attribute] == 'function' then object[attribute].call(@$el) else object[attribute]

  #templates
  tooltipTemplate: """
    <div>
      <p class="boot-tour-main-content"></p>
      <p style="text-align: right">
        <span class="boot-tour-skip-btn"></span>
        <span class="boot-tour-previous-btn"></span>
        <span class="boot-tour-next-btn"></span>
      </p>
    </div>
    """
  skipButtonTemplate: '<button class="btn btn-danger"><i class="icon-remove-circle icon-white"></i> Skip Tour</button>'
  nextButtonTemplate: '<button class="btn btn-primary">Next <i class="icon-chevron-right icon-white"></i></button>'
  doneButtonTemplate: '<button class="btn btn-primary"><i class="icon-ok icon-white"></i> Done</button>'
  previousButtonTemplate: '<button class="btn btn-primary"><i class="icon-chevron-left icon-white"></i> Previous</button>'

$.fn.extend
  boottour: (action, option) ->
    @each () ->
      options = typeof option == 'object' and option
      options ?= typeof action == 'object' and action
      $el = $(@)
      data = $el.data('boottour')
      $el.data('boottour', (data = new BootTour($el))) unless data
      data.setOptions(options)
      if typeof action == 'string'
        switch action
          when 'start' then data.startTour()
          when 'finish' then data.finishTour()
          when 'next' then data.runNextStep()
          when 'previous' then data.runPreviousStep()

#provide our custom remove event so we can close tour if 'ol' element is removed from DOM
$.event.special.bootTourDestroyed =
  remove: (o) ->
    o.handler?.apply(@, arguments)

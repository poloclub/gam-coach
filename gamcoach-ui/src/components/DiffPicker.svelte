<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';
  import { diffPickerConfigStore } from '../store';

  import easyIcon from '../img/icon-easy.svg';
  import veryEasyIcon from '../img/icon-very-easy.svg';
  import neutralIcon from '../img/icon-neutral.svg';
  import hardIcon from '../img/icon-hard.svg';
  import veryHardIcon from '../img/icon-very-hard.svg';
  import lockIcon from '../img/icon-lock.svg';
  import infoIcon from '../img/icon-info.svg';

  // Component bindings
  let component = null;
  let description = 'Difficulty to make a change';

  let diffPickerConfig = {
    feature: null,
    difficulty: 'neutral',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    action: ''
  };

  diffPickerConfigStore.set(diffPickerConfig);

  diffPickerConfigStore.subscribe(value => {

    if (value.action === 'to-show') {
      // Move to the new location
      d3.select(component)
        .style('left', `${value.x}px`)
        .style('top', `${value.y}px`);

      d3.select(component)
        .classed('show', true)
        .node()
        .focus();
    }

    diffPickerConfig = value;
  });

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'fill:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    const iconList = [
      { class: 'icon-easy', svg: easyIcon },
      { class: 'icon-very-easy', svg: veryEasyIcon },
      { class: 'icon-neutral', svg: neutralIcon },
      { class: 'icon-hard', svg: hardIcon },
      { class: 'icon-very-hard', svg: veryHardIcon },
      { class: 'icon-info', svg: infoIcon },
      { class: 'icon-lock', svg: lockIcon }
    ];

    iconList.forEach(d => {
      d3.select(component)
        .selectAll(`.svg-icon.${d.class}`)
        .each((_, i, g) => {
          let ele = d3.select(g[i]);
          let html = ele.html();
          html = html.concat(' ', preProcessSVG(d.svg));
          ele.html(html);
        });
    });
  };

  const iconMouseenterHandler = (e) => {
    let curIcon = d3.select(e.target);
    switch(curIcon.attr('data-diff')) {
    case 'very-easy':
      description = 'Easy peasy!';
      break;
    case 'easy':
      description = 'Fairly easy';
      break;
    case 'neutral':
      description = 'It\'s OK, I guess';
      break;
    case 'hard':
      description = 'Kinda hard';
      break;
    case 'very-hard':
      description = 'Very hard, but possible';
      break;
    case 'lock':
      description = 'I can\'t change it';
      break;
    default:
      console.warn('Unknown cases for the icon!');
      break;
    }
  };

  const iconMouseleaveHandler = () => {
    description = 'Difficulty to make a change';
  };

  const iconClickedHandler = (name) => {
    diffPickerConfig.difficulty = name;
    diffPickerConfig.action = 'picked';
    diffPickerConfigStore.set(diffPickerConfig);

    d3.select(component)
      .classed('show', false);
  };

  onMount(() => {
    bindInlineSVG(component);

    // Fix the width of this component so that hovering doesn't change it
    // Also register the focusout event
    let bbox = component.getBoundingClientRect();
    d3.select(component)
      .style('width', `${bbox.width}px`)
      .on('focusout', (e) => {
        d3.select(e.target).classed('show', false);
      });

    // Record the size info
    diffPickerConfig.width = bbox.width;
    diffPickerConfig.height = bbox.height;
    diffPickerConfigStore.set(diffPickerConfig);

    // Hide the view
    d3.select(component)
      .style('visibility', 'hidden')
      .classed('initial', false);

    d3.timeout(() => {
      d3.select(component)
        .style('visibility', null);
    }, 300);

  });

</script>

<style lang="scss">
  @import '../define';

  .diff-picker {
    background-color: white;
    padding: 0 0 10px 0;
    border-radius: 10px;
    border: 1px solid $gray-border;
    box-shadow: $shadow-border-large;
    position: absolute;
    z-index: 1;
    top: 100px;
    left: 100px;

    // transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transform-origin: 25% 100%;
    transform: scale(0);

    .svg-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: 100%;
      height: 100%;
      flex-grow: 1;
      transition: transform 150ms cubic-bezier(0.2, 0, 0.13, 2);
      transform: scale(1);

      :global(svg) {
        width: 1.2em;
        height: 1.2em;
      }

      &:hover {
        transform: scale(1.2);
      }
    }

    &::before {
      position: absolute;
      content: '';
      width: 10px;
      height: 10px;
      bottom: 0;
      left: 25%;
      border-bottom: 1px solid $gray-border;
      border-right: 1px solid $gray-border;
      transform: translate(-50%, 50%) rotate(45deg);
      background-color: inherit;
    }

    &:global(.show) {
      animation-name: enter;
      animation-duration: 150ms;
      animation-timing-function: cubic-bezier(0.2, 0, 0.13, 1.5);
      transform: scale(1);
    }

    &.initial {
      transform: scale(1);
      visibility: hidden;
    }

    &:focus {
      outline: none;
    }
  }

  @keyframes enter {
    0% {
      transform: scale(0.5);
    }
    100% {
      transform: scale(1);
    }
  }

  .description {
    cursor: pointer;
    padding: 5px 10px;
    font-size: 0.9em;
    color: $gray-500;
  }

  .icons {
    padding: 5px 10px;
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 1.5em;

    .left {
      width: 100%;
      display: flex;
      flex-direction: row;
    }
  }

  .h-separator {
    margin: 1px 0px 5px 0px;
    height: 1px;
    background-color: hsl(0, 0%, 90%);
    width: 100%;
    flex-shrink: 0;
  }

  .v-separator {
    margin: 0 8px 0 8px;
    width: 1px;
    background-color: hsl(0, 0%, 85%);
    height: 150%;
    flex-shrink: 0;
  }
</style>

<div class='diff-picker initial'
  tabIndex='0'
  bind:this={component}
  >

  <div class='description'>
    {description}
  </div>

  <div class='h-separator'></div>

  <div class='icons'>

    <div class='left'>

      <div class='svg-icon icon-very-easy'
        data-diff='very-easy'
        on:mouseenter={iconMouseenterHandler}
        on:mouseleave={iconMouseleaveHandler}
        on:click={() => iconClickedHandler('very-easy')}
      ></div>

      <div class='svg-icon icon-easy'
        data-diff='easy'
        on:mouseenter={iconMouseenterHandler}
        on:mouseleave={iconMouseleaveHandler}
        on:click={() => iconClickedHandler('easy')}
      ></div>

      <div class='svg-icon icon-neutral'
        data-diff='neutral'
        on:mouseenter={iconMouseenterHandler}
        on:mouseleave={iconMouseleaveHandler}
        on:click={() => iconClickedHandler('neutral')}
      ></div>

      <div class='svg-icon icon-hard'
        data-diff='hard'
        on:mouseenter={iconMouseenterHandler}
        on:mouseleave={iconMouseleaveHandler}
        on:click={() => iconClickedHandler('hard')}
      ></div>

      <div class='svg-icon icon-very-hard'
        data-diff='very-hard'
        on:mouseenter={iconMouseenterHandler}
        on:mouseleave={iconMouseleaveHandler}
        on:click={() => iconClickedHandler('very-hard')}
      ></div>

    </div>

    <div class='v-separator'></div>

    <div class='right'>
      <div class='svg-icon icon-lock'
        data-diff='lock'
        on:mouseenter={iconMouseenterHandler}
        on:mouseleave={iconMouseleaveHandler}
        on:click={() => iconClickedHandler('lock')}
      ></div>
    </div>

  </div>
</div>
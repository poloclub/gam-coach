<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';
  import { tooltipConfigStore } from '../store';

  import rightArrowIcon from '../img/icon-right-arrow.svg';

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'fill:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    d3.select(component)
      .selectAll('.svg-icon.icon-right-arrow')
      .html(preProcessSVG(rightArrowIcon));
  };

  let component = null;

  let feature = {
    name: 'FICO Score',
    featureName: 'fico_score',
  };

  onMount(() => {
    // Bind the SVG icons on mount
    bindInlineSVG(component);
  });

</script>

<style lang="scss">
  @import '../define';

  .feature-card {
    display: flex;
    flex-direction: column;
    height: 200px;
    width: 300px;
    border-radius: 10px;
    padding: 0.5em 0.8em;
    box-shadow: $shadow-border-light;
    background: white;
  }

  .feature-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .values {
    display: flex;
    flex-direction: row;
    align-items: center;

    .value-change {
      font-size: 0.8em;
      padding: 0px 15px 8px 5px;
      margin: -5px 0 0 0;
      color: $green-600;
    }
  }

  .feature-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 5px;

    .svg-icon {
      color: $coolGray-800;
      :global(svg) {
        width: 10px;
        height: 5px;
      }
    }
  }

  .svg-icon {
    color: $coolGray-800;
    :global(svg) {
      width: 1em;
      height: 1em;
    }
  }

  .arrow-right {
    box-sizing: border-box;
    position: relative;
    display: block;
    width: 100%;
    height: 5px;

    &::after,&::before {
      content: "";
      display: block;
      box-sizing: border-box;
      position: absolute;
      right: 3px;
    }

    &::after {
      width: 8px;
      height: 8px;
      border-top: 2px solid $gray-400;
      border-right: 2px solid $gray-400;
      transform: rotate(45deg);
      bottom: 7px;
    }

    &::before {
      width: calc(100% - 4px);
      height: 2px;
      bottom: 10px;
      background: $gray-400;
    }
  }

</style>

<div class='feature-card' bind:this={component}>

  <div class='feature-header'>
    <span class='feature-name'>
      FICO Score
    </span>

    <div class='values'>
      <span class='value-old'>
        728
      </span>

      <div class='feature-arrow'>
        <span class='value-change'>
          +20.55
        </span>

        <div class='arrow-right'></div>
      </div>


      <span class='value-new'>
        800
      </span>
    </div>
  </div>

  <div class='feature-hist'>

  </div>

  <div class='feature-slider'>

  </div>

</div>
<script>
  import d3 from '../../utils/d3-import';
  import { onMount } from 'svelte';

  export let feature = null;

  // Component variables
  let component = null;

  const translateFeatureValue = (feature, value) => {
    if (feature.isCont) {
      return d3.format(',.2~f')(value);
    } else {
      return feature.labelEncoder[value];
    }
  };

  onMount(() => {
    //
  });

</script>

<style lang='scss'>

  @import '../../define';

  .list-item {
    display: flex;
    flex-direction: column;

    background: $gray-200;
    border-radius: 5px;
    border: 1px solid $gray-border;
    padding: 5px 8px;
    cursor: pointer;

    transition: background 150ms ease-in-out;
  }

  .list-item:hover {
    background: adjust-color($color: $gray-200, $lightness: -3%);
  }

  .list-item:active {
    background: adjust-color($color: $gray-200, $lightness: -5%);
  }

  .item-header {
    font-weight: 500;
  }

  .item-content {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
  }

  .item-value-change {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;

    .arrow-right {
      color: $gray-500;
    }
  }

  .arrow-right {
    box-sizing: border-box;
    position: relative;
    display: block;
    width: 15px;
    height: 5px;

    &::after,
    &::before {
      content: "";
      display: block;
      box-sizing: border-box;
      position: absolute;
      right: 0px;
    }

    &::after {
      width: 8px;
      height: 8px;
      border-top: 2px solid currentColor;
      border-right: 2px solid currentColor;
      transform: rotate(45deg);
      bottom: -2px;
    }

    &::before {
      width: 100%;
      height: 2px;
      bottom: 1px;
      background: currentColor;
    }

  }

</style>

<div class='list-item' bind:this={component}>

  <div class='item-header'>
    {feature.data.description.displayName}
  </div>

  <div class='item-content'>

    {#if feature.isChanged !== 0}

      <!-- Show how the value is changed -->
      <div class='item-value-change'>
        {translateFeatureValue(feature, feature.originalValue)}
        <div class='arrow-right'></div>
        {translateFeatureValue(feature, feature.originalValue)}
      </div>

    {:else}

      <!-- Only show the original value  -->
      <div class='item-value-change'>
        {translateFeatureValue(feature, feature.originalValue)}
      </div>

    {/if}


  </div>

</div>
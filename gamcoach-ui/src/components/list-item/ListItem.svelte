<script>
  import d3 from '../../utils/d3-import';
  import { onMount } from 'svelte';

  export let feature = null;

  // Component variables
  let component = null;
  const contFormatter = d3.format(',.2~f');

  /**
   * Display the feature's value.
   */
  const displayFeatureValue = (feature, value) => {
    if (feature.isCont) {
      return contFormatter(value);
    } else {
      return feature.labelEncoder[value];
    }
  };

  /**
   * Use text to show the difficulty
   */
  const displayDifficulty = (feature) => {
    const difficultyDict = {
      1: 'Very Easy to Change',
      2: 'Easy to Change',
      3: 'Default',
      4: 'Hard to Change',
      5: 'Very Hard to Change',
      6: 'Impossible to Change'
    };

    return difficultyDict[feature.difficulty];
  };

  /**
   * Display the acceptable ranges of the given feature
   */
  const displayAcceptableRange = (feature) => {
    let rangeText = '';
    if (feature.isCont) {
      rangeText = `Between ${contFormatter(feature.acceptableRange[0])}
        and ${contFormatter(feature.acceptableRange[1])}`;
    } else {
      if (feature.acceptableRange.length === 1) {
        rangeText = `${feature.labelEncoder[feature.acceptableRange[0]]}`;
      } else if (feature.acceptableRange.length === 2) {
        rangeText = `${feature.labelEncoder[feature.acceptableRange[0]]}
          or ${feature.labelEncoder[feature.acceptableRange[1]]}`;
      } else {
        rangeText = '';
        feature.acceptableRange.forEach((d, i) => {
          rangeText = rangeText.concat(feature.labelEncoder[d]);
          if (i < feature.acceptableRange.length - 2) {
            rangeText = rangeText.concat(', ');
          } else if (i === feature.acceptableRange.length - 2) {
            rangeText = rangeText.concat(', or ');
          } else {
            rangeText = rangeText.concat('');
          }
        });
      }
    }

    return rangeText;
  };

  onMount(() => {
    //
  });

</script>

<style lang='scss'>
  @import './ListItem.scss';
</style>

<div class='list-item' bind:this={component}>

  <div class='item-header'>
    {feature.data.description.displayName}
  </div>

  <div class='item-content'>

    {#if feature.isChanged !== 0}

      <!-- Show how the value is changed -->
      <div class='item-value item-value-change'>
        {displayFeatureValue(feature, feature.originalValue)}
        <div class='arrow-right'></div>
        {displayFeatureValue(feature, feature.originalValue)}
      </div>

    {:else}

      <!-- Only show the original value  -->
      <div class='item-value'>
        {displayFeatureValue(feature, feature.originalValue)}
      </div>

    {/if}

    {#if feature.isConstrained}

      <div class='item-constraint-content'>

        <!-- Show the difficulty tag -->
        {#if feature.difficulty !== 3}
          <div class='difficulty-tag'>
            {displayDifficulty(feature)}
          </div>
        {/if}

        <!-- Show the acceptable range tab -->
        {#if feature.acceptableRange !== null}
          <div class='acceptable-range-tag'>
            {displayAcceptableRange(feature)}
          </div>
        {/if}

      </div>

    {/if}

  </div>

</div>
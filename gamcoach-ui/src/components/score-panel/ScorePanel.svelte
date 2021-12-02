<script>
  // @ts-check
  import '../../typedef';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { tooltipConfigStore } from '../../store';
  import { initScoreSVG } from './ScorePanel';

  export let windowLoaded = false;

  const unsubscribes = [];

  // Set up tooltip
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {tooltipConfig = value;})
  );

  // Component variables
  /** @type {HTMLElement}*/
  let component = null;

  onMount(() => {
    initScoreSVG(component);
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  // $: windowLoaded;

</script>

<style lang='scss'>
  @import './ScorePanel.scss';
</style>

<div class='score-panel' bind:this={component}>
  <svg class='score-svg'></svg>
</div>
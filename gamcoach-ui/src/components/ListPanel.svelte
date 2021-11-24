<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';

  import { tooltipConfigStore } from '../store';

  export let features = [];
  export let windowLoaded = false;

  // Set up tooltip
  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {tooltipConfig = value;});

  // Component variables
  let component = null;
  const curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
  ];

  const initList = () => {
    console.log('initializing the list!');
  };

  onMount(() => {
    //
  });

  $: windowLoaded && features.length !== 0 && initList();

</script>

<style lang='scss'>

  @import '../define';

  .list-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: gray;
  }

</style>

<div class='list-panel' bind:this={component}>

</div>
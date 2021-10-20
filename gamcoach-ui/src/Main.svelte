<script>
  // import Header from './Header.svelte';
  // import GAM from './GAM.svelte';
  import Tooltip from './components/Tooltip.svelte';

  import { tooltipConfigStore } from './store';

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;

  tooltipConfigStore.subscribe(value => {tooltipConfig = value;});
</script>

<style lang='scss'>

  @import 'define';

  .main-standalone {
    display: flex;
    flex-direction: column;
  }

  .content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 50px;
    padding: 30px 0 30px 0;
    justify-content: center;
    align-items: center;
    height: calc(100vh - 50px);
    max-height: 800px;
    overflow-y: scroll;
    width: 100vw;
    box-sizing: border-box;
    border: 1px solid $gray-border;
  }


</style>

<div class='main-standalone'>
  <div class='header'>
    <!-- <Header /> -->
  </div>

  <Tooltip bind:this={tooltip}/>

  <div class='content'>

    <!-- <GAM /> -->

  </div>


</div>
<script>
  import { onMount } from 'svelte';

  export let feature = null;

  // Component variables
  let component = null;

  onMount(() => {
    //
  });

</script>

<style lang='scss'>

  @import '../define';

  .list-item {
    display: flex;

    background: $gray-200;
  }

</style>

<div class='list-item' bind:this={component}>

  <div class='item-header'>
    {feature.data.description.displayName}
  </div>

  <div class='item-content'>

  </div>

</div>
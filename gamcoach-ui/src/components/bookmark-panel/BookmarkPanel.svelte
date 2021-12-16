<script>
  // @ts-check
  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';

  import closeIcon from '../../img/icon-close.svg';

  // Component bindings
  let component = null;

  const cancelClicked = () => {
  };

  const confirmClicked = () => {
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];
    bindInlineSVG(component, iconList);
  });

</script>

<style lang="scss">
  @import './ConfirmModal.scss';
</style>

<div class='bookmark'
  tabIndex='0'
  bind:this={component}
  class:no-display={true}
>

</div>
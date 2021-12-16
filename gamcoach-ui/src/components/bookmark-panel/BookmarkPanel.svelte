<script>
  // @ts-check
  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';

  import receiptIcon from '../../img/icon-receipt.svg';
  import closeIcon from '../../img/icon-close-outline.svg';

  // Component bindings
  let component = null;

  const cancelClicked = () => {
  };

  const confirmClicked = () => {
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-receipt', svg: receiptIcon },
      { class: 'icon-close', svg: closeIcon },
    ];
    bindInlineSVG(component, iconList);
  });

</script>

<style lang="scss">
  @import './BookmarkPanel.scss';
</style>

<div class='bookmark'
  tabIndex='0'
  bind:this={component}
  class:no-display={true}
>
  <div class='header'>
    <div class='title-line'>
      <span class='title'>Your Saved Plans</span>
      <span class='svg-icon icon-close'></span>
    </div>
    <span class='description'>
      Once you have accomplished any one of the plans, we will guarantee you a loan approval.
    </span>
  </div>

  <div class='plan-list'>

  </div>

  <div class='download'>
    <span class='text'>Download Receipt</span>
    <span class='svg-icon icon-receipt'></span>
  </div>
</div>
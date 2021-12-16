<script>
  // @ts-check
  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';
  import { bookmarkConfigStore } from '../../store';

  import receiptIcon from '../../img/icon-receipt.svg';
  import closeIcon from '../../img/icon-close-outline.svg';

  export let windowLoaded = false;

  // Component bindings
  let component = null;
  let initialized = false;

  // Set up the stores
  let bookmarkConfig = {
    show: false,
    plans: [],
    focusOutTime: 0
  };
  bookmarkConfigStore.subscribe(value => {
    if (value.show) {
      d3.select(component)
        .node()
        .focus();
    }
    bookmarkConfig = value;
  });

  const closeClicked = () => {
    bookmarkConfig.show = false;
    bookmarkConfig.focusOutTime = Date.now();
    bookmarkConfigStore.set(bookmarkConfig);
  };

  const downloadClicked = () => {
  };

  /**
   * Position the panel under bookmarks and generate buttons
   */
  const initPanel = () => {
    initialized = true;
    const controlBBox = d3.select('.coach-panel-wrapper')
      .select('.coach-controls')
      .node()
      .getBoundingClientRect();

    d3.select(component)
      .style('left', `${controlBBox.left}px`)
      .style('width', `${controlBBox.width}px`);
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-receipt', svg: receiptIcon },
      { class: 'icon-close', svg: closeIcon },
    ];
    bindInlineSVG(component, iconList);

    // Register the focusout event
    d3.select(component)
      .on('focusout', () => {
        if (bookmarkConfig.show) {
          bookmarkConfig.show = false;
          bookmarkConfig.focusOutTime = Date.now();
          bookmarkConfigStore.set(bookmarkConfig);
        }
      });
  });

  $: windowLoaded && !initialized && initPanel();

</script>

<style lang="scss">
  @import './BookmarkPanel.scss';
</style>

<div class='bookmark'
  tabIndex='0'
  bind:this={component}
  class:show={bookmarkConfig.show}
>
  <div class='header'>
    <div class='title-line'>
      <span class='title'>Your Saved Plans</span>
      <span class='svg-icon icon-close' on:click={() => closeClicked()}></span>
    </div>
    <span class='description'>
      Once you have accomplished any one of the plans, we will guarantee you a loan approval.
    </span>
  </div>

  <div class='plan-list'>

  </div>

  <div class='download' on:click={() => downloadClicked()}>
    <span class='text'>Download Receipt</span>
    <span class='svg-icon icon-receipt'></span>
  </div>
</div>
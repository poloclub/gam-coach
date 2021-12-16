<script>
  // @ts-check
  import d3 from '../../utils/d3-import';
  import { onMount } from 'svelte';
  import { confirmModalConfigStore } from '../../store';

  import closeIcon from '../../img/icon-close.svg';

  // Component bindings
  let component = null;

  let confirmModalConfig = {
    name: '',
    show: false,
    confirmed: false,
    contextLines: [
      `After regenerating plans, you will <b>lose access</b> to all current
       unsaved plans.`,
      'Make sure to click the star icons to save plans you like.'
    ],
    confirmText: 'Regenerate',
    cancelText: 'Cancel',
    doNotShowAgain: true
  };

  confirmModalConfigStore.set(confirmModalConfig);

  confirmModalConfigStore.subscribe(value => {
    confirmModalConfig = value;
  });

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'fill:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];

    iconList.forEach(d => {
      d3.select(component)
        .selectAll(`.svg-icon.${d.class}`)
        .each((_, i, g) => {
          const ele = d3.select(g[i]);
          let html = ele.html();
          html = html.concat(' ', preProcessSVG(d.svg));
          ele.html(html);
        });
    });
  };

  const closeClickedHandler = () => {
    d3.select(component)
      .classed('show', false);
  };

  onMount(() => {
    bindInlineSVG(component);

    d3.timeout(() => {
      confirmModalConfig.show = true;
      confirmModalConfigStore.set(confirmModalConfig);
    }, 1000);
  });

</script>

<style lang="scss">
  @import './ConfirmModal.scss';
</style>

<div class='confirm-modal-back'>

</div>

<div class='confirm-modal'
  tabIndex='0'
  bind:this={component}
  class:show={confirmModalConfig.show}
>

  <div class='header'>
    <span class='title'>Regenerate Plans</span>

    <div class='svg-icon icon-close'
      on:click={() => closeClickedHandler()}
    ></div>
  </div>

  <div class='content'>
    {#each confirmModalConfig.contextLines as line}
      <div class='content-text'>
        {@html line}
      </div>
    {/each}

    <div class='content-skip'>
      <label>
        <input type="checkbox" bind:checked={confirmModalConfig.doNotShowAgain}>
        Do not ask me again
      </label>
    </div>
  </div>

  <div class='control'>

    <div class='button button-cancel'>
      {confirmModalConfig.cancelText}
    </div>

    <div class='button button-confirm'>
      {confirmModalConfig.confirmText}
    </div>

  </div>
</div>
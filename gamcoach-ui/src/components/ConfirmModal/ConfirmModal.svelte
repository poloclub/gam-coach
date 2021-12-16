<script>
  // @ts-check
  import d3 from '../../utils/d3-import';
  import { onMount } from 'svelte';
  import { confirmModalConfigStore } from '../../store';

  import closeIcon from '../../img/icon-close.svg';

  // Component bindings
  let component = null;
  let confirmModalConfig = null;

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

  const getInitConfig = () => {
    return {
      show: false,
      confirmed: false,
      contextLines: [''],
      confirmText: 'OK',
      cancelText: 'Cancel',
      doNotShowAgain: false,
      confirmCallback: () => null
    };
  };

  const cancelClicked = () => {
    confirmModalConfig = getInitConfig();
    confirmModalConfigStore.set(confirmModalConfig);
  };

  const confirmClicked = () => {
    confirmModalConfig.confirmed = true;
    confirmModalConfig.show = false;
    confirmModalConfig.confirmCallback(
      confirmModalConfig.doNotShowAgain,
      confirmModalConfig.confirmed
    );
    confirmModalConfig = getInitConfig();
    confirmModalConfigStore.set(confirmModalConfig);
  };

  onMount(() => {
    bindInlineSVG(component);

    // d3.timeout(() => {
    //   confirmModalConfig.show = true;
    //   confirmModalConfigStore.set(confirmModalConfig);
    // }, 5000);
  });

</script>

<style lang="scss">
  @import './ConfirmModal.scss';
</style>

<div class='confirm-modal-back'
  class:no-display={!confirmModalConfig.show}
>
</div>

<div class='confirm-modal'
  tabIndex='0'
  bind:this={component}
  class:no-display={!confirmModalConfig.show}
>

  <div class='header'>
    <span class='title'>Regenerate Plans</span>

    <div class='svg-icon icon-close'
      on:click={() => cancelClicked()}
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

    <div class='button button-cancel'
      on:click={() => cancelClicked()}
    >
      {confirmModalConfig.cancelText}
    </div>

    <div class='button button-confirm'
      on:click={() => confirmClicked()}
    >
      {confirmModalConfig.confirmText}
    </div>

  </div>
</div>
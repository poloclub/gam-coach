<script>
  // @ts-check
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';
  import { confirmModalConfigStore } from '../../store';

  import closeIcon from '../../img/icon-close.svg';

  // Component bindings
  let component = null;
  let confirmModalConfig = null;

  confirmModalConfigStore.subscribe(value => {
    confirmModalConfig = value;
  });

  const getInitConfig = () => {
    return {
      title: 'Confirmation',
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
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];
    bindInlineSVG(component, iconList);

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
    <span class='title'>{confirmModalConfig.title}</span>

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
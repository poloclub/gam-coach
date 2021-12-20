<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';
  import { inputFormConfigStore } from '../../store';
  import { getInputLists } from './InputForm';

  import closeIcon from '../../img/icon-close.svg';

  // Component bindings
  let component = null;
  /** @type {inputFormConfig} */
  let inputFormConfig = null;
  let contList = [];
  let catList = [];

  inputFormConfigStore.subscribe(value => {
    inputFormConfig = value;

    if (inputFormConfig.features !== null &&
      inputFormConfig.curExample.length > 0
    ) {
      ({contList, catList} = getInputLists(inputFormConfig.features,
        inputFormConfig.curExample));
      console.log(contList);
    }
  });

  const cancelClicked = () => {
    inputFormConfig.show = false;
    inputFormConfigStore.set(inputFormConfig);
  };

  const confirmClicked = () => {
    inputFormConfig.show = false;
    inputFormConfigStore.set(inputFormConfig);
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];
    bindInlineSVG(component, iconList);

    d3.timeout(() => {
      inputFormConfig.show = true;
      inputFormConfigStore.set(inputFormConfig);
    }, 1000);
  });

</script>

<style lang="scss">
  @import './InputForm.scss';
</style>

<div class='input-form-back'
  class:no-display={!inputFormConfig.show}
>
</div>

<div class='input-form'
  tabIndex='0'
  bind:this={component}
  class:no-display={!inputFormConfig.show}
>

  <div class='header'>
    <span class='title'>Edit Input Values</span>

    <div class='svg-icon icon-close'
      on:click={() => cancelClicked()}
    ></div>
  </div>

  <div class='content'>
    <div class='content-cont'>
      {#each contList as item}
        <div class='input-wrapper'>
          <span class='name' title={item.description}>{item.name}</span>
          <input class='feature-input' type='number'
            step={item.requiresInt? '1':'0.1'} bind:value={item.curValue}>
        </div>
      {/each}
    </div>

    <div class='content-cat'>
      {#each catList as item}
        <div class='input-wrapper'>
          <span class='name' title={item.description}>{item.name}</span>
          <select class='feature-select' bind:value={item.curValue}>
            {#each item.allValues as value}
              <option value={value.level}>{value.levelDisplayName}</option>
            {/each}
          </select>
        </div>
      {/each}
    </div>

  </div>

  <div class='control'>

    <div class='button button-cancel'
      on:click={() => cancelClicked()}
    >
      Cancel
    </div>

    <div class='button button-confirm'
      on:click={() => confirmClicked()}
    >
      Save
    </div>

  </div>
</div>
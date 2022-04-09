<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { EBM } from '../../ebm/ebm';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount, onDestroy } from 'svelte';
  import {
    inputFormConfigStore,
    ebmStore,
    tooltipConfigStore
  } from '../../store';
  import {
    getInputLists,
    getNewCurExample,
    isCurExampleChanged
  } from './InputForm';
  import {
    titleMouseenterHandler,
    titleMouseleaveHandler
  } from '../feature-card-cat/FeatureCardCat';

  import closeIcon from '../../img/icon-close.svg';

  // Component bindings
  let component = null;

  /** @type {InputFormConfig} */
  let inputFormConfig = null;

  /** @type {EBM} */
  let ebm = null;

  let contList = [];
  let catList = [];
  let newCurExample = [];
  let isOutRange = false;

  let tooltipConfig = null;
  tooltipConfigStore.subscribe((value) => {
    tooltipConfig = value;
  });

  const inputFormConfigStoreUnsubscribe = inputFormConfigStore.subscribe(
    (value) => {
      inputFormConfig = value;

      if (
        inputFormConfig.features !== null &&
        inputFormConfig.curExample.length > 0
      ) {
        ({ contList, catList } = getInputLists(
          inputFormConfig.features,
          inputFormConfig.curExample
        ));
        newCurExample = getNewCurExample(contList, catList);
      }
    }
  );

  const ebmStoreUnsubscribe = ebmStore.subscribe((value) => (ebm = value));

  const cancelClicked = () => {
    inputFormConfig.show = false;
    inputFormConfigStore.set(inputFormConfig);
  };

  const confirmClicked = () => {
    if (isOutRange) return;
    inputFormConfig.show = false;

    // Check if we should update the curExample
    if (isCurExampleChanged(inputFormConfig.curExample, newCurExample)) {
      inputFormConfig.curExample = newCurExample;
      inputFormConfig.action = 'saved';
    }
    inputFormConfigStore.set(inputFormConfig);
  };

  const inputUpdated = () => {
    if (
      contList.length + catList.length > 0 &&
      ebm.predictProb !== undefined &&
      !inputFormConfig.plansInfo?.isRegression
    ) {
      newCurExample = getNewCurExample(contList, catList);
      const newScore = ebm.predictProb([newCurExample])[0];
      if (inputFormConfig.plansInfo.classTarget[0] === 1) {
        isOutRange = newScore >= 0.5;
      } else {
        isOutRange = newScore < 0.5;
      }
    }
  };

  onMount(() => {
    const iconList = [{ class: 'icon-close', svg: closeIcon }];
    bindInlineSVG(component, iconList);
  });

  onDestroy(() => {
    ebmStoreUnsubscribe();
    inputFormConfigStoreUnsubscribe();
  });

  $: contList && ebm && inputUpdated();
  $: catList && ebm && inputUpdated();
</script>

<div class="input-form-back" class:no-display={!inputFormConfig.show} />

<div
  class="input-form"
  tabIndex="0"
  bind:this={component}
  class:no-display={!inputFormConfig.show}
>
  <div class="header">
    <span class="title">Edit Input Values</span>

    <div class="svg-icon icon-close" on:click={() => cancelClicked()} />
  </div>

  <div class="content">
    <div class="content-cont">
      {#each contList as item}
        <div class="input-wrapper">
          <span
            class="name"
            on:mouseenter={(e) =>
              titleMouseenterHandler(
                e,
                tooltipConfig,
                tooltipConfigStore,
                item.description
              )}
            on:mouseleave={(e) =>
              titleMouseleaveHandler(e, tooltipConfig, tooltipConfigStore)}
            >{item.name}</span
          >
          <input
            class="feature-input"
            type="number"
            step={item.requiresInt ? '1' : '0.1'}
            bind:value={item.curValue}
          />
        </div>
      {/each}
    </div>

    <div class="content-cat">
      {#each catList as item}
        <div class="input-wrapper">
          <span
            class="name"
            on:mouseenter={(e) =>
              titleMouseenterHandler(
                e,
                tooltipConfig,
                tooltipConfigStore,
                item.description
              )}
            on:mouseleave={(e) =>
              titleMouseleaveHandler(e, tooltipConfig, tooltipConfigStore)}
            >{item.name}</span
          >
          <select class="feature-select" bind:value={item.curValue}>
            {#each item.allValues as value}
              <option value={value.level}>{value.levelDisplayName}</option>
            {/each}
          </select>
        </div>
      {/each}
    </div>
  </div>

  <div class="control">
    <div class="error-message" class:out-range={isOutRange}>
      Current input already gives the desired AI decision. Try a different
      value.
    </div>

    <div class="button button-cancel" on:click={() => cancelClicked()}>
      Cancel
    </div>

    <div
      class="button button-confirm"
      class:out-range={isOutRange}
      on:click={() => confirmClicked()}
    >
      Save
    </div>
  </div>
</div>

<style lang="scss">
  @import './InputForm.scss';
</style>

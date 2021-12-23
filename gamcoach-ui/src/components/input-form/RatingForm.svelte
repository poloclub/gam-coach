<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { EBM } from '../../ebm/ebm';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';
  import { bookmarkConfigStore, ratingFormConfigStore } from '../../store';
  import { getInputLists, getNewCurExample,
    isCurExampleChanged } from './InputForm';

  import closeIcon from '../../img/icon-close.svg';

  // Component bindings
  let component = null;
  const formatter = d3.format(',.2~f');

  /// Set up the stores
  /** @type {RatingFormConfig} */
  let ratingFormConfig = null;

  /** @type {Object.<number, PlanRating>}*/
  const planRatingsMap = {};

  ratingFormConfigStore.subscribe(value => {
    // Create a saved plan index
    if (value.show) {
    }
    ratingFormConfig = value;
  });

  /** @type {BookmarkConfig} */
  let bookmarkConfig = null;
  bookmarkConfigStore.subscribe(value => {
    [...value.plans.keys()].forEach((planIndex) => {
      planRatingsMap[planIndex] = {
        planIndex,
        rating: '0',
        explanation: ''
      };
    });

    bookmarkConfig = value;
    console.log(planRatingsMap);
  });

  const cancelClicked = () => {
    ratingFormConfig.show = false;
    ratingFormConfigStore.set(ratingFormConfig);
  };

  const confirmClicked = () => {
    if (bookmarkConfig.plans.size === 0) return;
  };

  /**
   * Return true if users can submit the rating form
   * @param {BookmarkConfig} bookmarkConfig
   * @param {Object.<number, PlanRating>} planRatingsMap
   */
  const canSubmit = (bookmarkConfig, planRatingsMap) => {
    let canSubmit = true;

    if (bookmarkConfig.plans.size === 0) {
      canSubmit = false;
    }

    console.log(planRatingsMap);

    Object.keys(planRatingsMap).forEach((planIndex) => {
      console.log(planRatingsMap[planIndex], planRatingsMap[planIndex].rating === '0', planRatingsMap[planIndex].explanation === '');
      if (planRatingsMap[planIndex].rating === '0') {
        canSubmit = false;
      }
      if (planRatingsMap[planIndex].explanation === '') {
        canSubmit = false;
      }
    });

    console.log('to true');

    return canSubmit;
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];
    bindInlineSVG(component, iconList);

    // d3.timeout(() => {
    //   ratingForm.show = true;
    // }, 1000);
  });

</script>

<style lang="scss">
  @import './RatingForm.scss';
</style>

<div class='input-form-back'
  class:no-display={!ratingFormConfig.show}
>
</div>

<div class='input-form'
  tabIndex='0'
  bind:this={component}
  class:no-display={!ratingFormConfig.show}
>

  <div class='header'>
    <span class='title'>Rate the Plans</span>

    <div class='svg-icon icon-close'
      on:click={() => cancelClicked()}
    ></div>
  </div>

  <div class='content'>
    {#if bookmarkConfig.plans.size === 0}
      <div class='description'>You need to bookmark at least one plan.</div>
    {:else}
      <div class='description'>Almost there! Please review and rate the plans you have bookmarked. Thank you!</div>
      {#each [...bookmarkConfig.plans] as [planIndex, savedPlan]}
        <div class='plan-row'>
          <div class='plan-title'>
            Plan {planIndex}
          </div>

          <div class='plan-block'>
            <div class='plan-change'>
              {#each savedPlan.getChangeList(bookmarkConfig.features) as item}
                <div class='plan-feature'>
                  <div class='feature-name'>{item.featureDisplayName}</div>
                  <div class='values'>
                    {item.isCont ? formatter(item.originalValue) : item.originalValue}
                      <div class='feature-arrow'
                        class:user={false}
                      >
                        {#if item.isCont}
                          <span class='value-change'>
                            {`${(item.changeValue) < 0 ? '' :'+'}${formatter(
                              item.changeValue
                            )}`}
                          </span>
                          <div class='arrow-right'></div>
                        {:else}
                          <div class='arrow-right-cat'></div>
                        {/if}

                      </div>
                    {item.isCont ? formatter(item.newValue) : item.newValue}
                  </div>
                </div>
              {/each}
            </div>

            <div class='plan-input'>

              <div class='plan-review'>
                <label for={`review-${planIndex}`}>Why do you like this plan?</label>
                <textarea id={`review-${planIndex}`}
                  bind:value={planRatingsMap[planIndex].explanation}
                ></textarea>
              </div>

              <div class='plan-rating'>
                <select class='rating-select' bind:value={planRatingsMap[planIndex].rating}>
                  <option value='0'>Select a Rating Score</option>
                  <option value='1'>1 - Okay plan</option>
                  <option value='2'>2 - Great plan</option>
                  <option value='3'>3 - Best plan ever!</option>
                </select>
              </div>

            </div>

          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class='control'>

    <div class='error-message' class:out-range={!canSubmit(bookmarkConfig, planRatingsMap)}>
      Review and rate all plans to submit
    </div>

    <div class='button button-cancel'
      on:click={() => cancelClicked()}
    >
      Cancel
    </div>

    <div class='button button-confirm'
      class:out-range={!canSubmit(bookmarkConfig, planRatingsMap)}
      on:click={() => confirmClicked()}
    >
      Submit
    </div>

  </div>
</div>
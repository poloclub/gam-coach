<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';
  import { bookmarkConfigStore, ratingFormConfigStore } from '../../store';

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
    ratingFormConfig = value;
  });

  /** @type {BookmarkConfig} */
  let bookmarkConfig = null;
  bookmarkConfigStore.subscribe(value => {
    // Create a saved plan index
    [...value.plans.keys()].forEach((planIndex) => {
      const existingRating = ratingFormConfig.planRatings.filter(
        d => d.planIndex === +planIndex
      );
      let explanation = '';
      let rating = '0';

      if (existingRating.length === 1) {
        explanation = existingRating[0].explanation;
        rating = existingRating[0].rating;
      }

      planRatingsMap[planIndex] = {
        planIndex,
        rating,
        explanation,
        isSaved: true
      };
    });

    // Remove plans that are no longer in the bookmark list
    Object.keys(planRatingsMap).forEach(key => {
      if (![...value.plans.keys()].includes(+key)) {
        delete planRatingsMap[key];
      }
    });

    if (value.unpickedPlans !== undefined) {
      [...value.unpickedPlans.keys()].forEach((planIndex) => {
        const existingRating = ratingFormConfig.planRatings.filter(
          d => d.planIndex === +planIndex
        );
        let explanation = '';
        let rating = '0';

        if (existingRating.length === 1) {
          explanation = existingRating[0].explanation;
          rating = existingRating[0].rating;
        }

        planRatingsMap[planIndex] = {
          planIndex,
          rating,
          explanation,
          isSaved: false
        };
      });
    }

    bookmarkConfig = value;
  });

  const cancelClicked = () => {
    ratingFormConfig.show = false;
    ratingFormConfigStore.set(ratingFormConfig);
  };

  const confirmClicked = () => {
    if (!canSubmit(bookmarkConfig, planRatingsMap)) {
      return;
    }

    // Convert local ratings to store
    ratingFormConfig.planRatings = [];

    Object.keys(planRatingsMap).forEach(planIndex => {
      /** @type {PlanRating} */
      const planRating = {
        planIndex: parseInt(planIndex),
        rating: planRatingsMap[planIndex].rating,
        explanation: planRatingsMap[planIndex].explanation,
        isSaved: planRatingsMap[planIndex].isSaved
      };
      ratingFormConfig.planRatings.push(planRating);
    });

    // Tell the parent that all plans are rated
    ratingFormConfig.action = 'submit';
    ratingFormConfig.show = false;
    ratingFormConfigStore.set(ratingFormConfig);
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

    Object.keys(planRatingsMap).forEach((planIndex) => {
      if (planRatingsMap[planIndex].rating === '0') {
        canSubmit = false;
      }
      if (planRatingsMap[planIndex].explanation === '') {
        canSubmit = false;
      }
    });

    return canSubmit;
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];
    bindInlineSVG(component, iconList);
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

      <span class='tips'>
        Tips: If you find it hard to find good answers for the following questions,
        we suggest to refresh the webpage and restart <strong>Task 2</strong>.
      </span>

      <div class='description bottom'>
        Please review and rate the plans you have bookmarked.
        All explanations should emphasize why these plans are helpful <strong>for you</strong>.
      </div>
      {#each [...bookmarkConfig.plans] as [planIndex, savedPlan]}
        <div class='plan-row'>
          <div class='plan-title'>
            Plan {planIndex} (picked by you)
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

      <div class='description bottom'>
        We notice that you didn't pick the following plans.
        Why didn't you pick them?
        Explanations should emphasize why these plans are less helpful <strong>for you</strong>,
        comparing to the plans that you have picked.
      </div>
      {#if bookmarkConfig.unpickedPlans !== undefined}
      {#each [...bookmarkConfig.unpickedPlans] as [planIndex, savedPlan]}
        <div class='plan-row'>
          <div class='plan-title'>
            Plan {planIndex} (unpicked)
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
                <label for={`review-${planIndex}`}>Why don't you pick this plan?</label>
                <textarea id={`review-${planIndex}`}
                  bind:value={planRatingsMap[planIndex].explanation}
                ></textarea>
              </div>

              <div class='plan-rating'>
                <select class='rating-select' bind:value={planRatingsMap[planIndex].rating}>
                  <option value='0'>Select a Rating Score</option>
                  <option value='-1'>-1 - Can be helpful in some cases</option>
                  <option value='-2'>-2 - Unhelpful plan</option>
                  <option value='-3'>-3 - Harmful plan</option>
                </select>
              </div>

            </div>

          </div>
        </div>
      {/each}
      {/if}

    {/if}
  </div>

  <div class='control'>

    <span class='error-message' class:out-range={!canSubmit(bookmarkConfig, planRatingsMap)}>
      <strong>Review</strong> and <strong>rate</strong> all plans to submit
    </span>

    <div class='button button-cancel'
      on:click={() => cancelClicked()}
    >
      Back
    </div>

    <div class='button button-confirm'
      class:out-range={!canSubmit(bookmarkConfig, planRatingsMap)}
      on:click={() => confirmClicked()}
    >
      Submit
    </div>

  </div>
</div>
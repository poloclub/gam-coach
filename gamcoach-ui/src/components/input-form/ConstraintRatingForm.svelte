<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';
  import { bookmarkConfigStore, constraintRatingFormConfigStore,
    constraintsStore } from '../../store';
  import { Constraints } from '../coach/Coach';
  import { getConstraintList } from './ConstraintRatingForm';

  import closeIcon from '../../img/icon-close.svg';
  import easyIcon from '../../img/icon-easy.svg';
  import veryEasyIcon from '../../img/icon-very-easy.svg';
  import neutralIcon from '../../img/icon-neutral.svg';
  import hardIcon from '../../img/icon-hard.svg';
  import veryHardIcon from '../../img/icon-very-hard.svg';
  import lockIcon from '../../img/icon-lock.svg';

  // Component bindings
  let component = null;
  const formatter = d3.format(',.2~f');

  const difficultyMap = {
    'very-hard': ['Very hard to change', veryHardIcon],
    'hard': ['Hard to change', hardIcon],
    'neutral': ['Default', neutralIcon],
    'easy': ['Easy to change', easyIcon],
    'very-easy': ['Very easy to change', veryEasyIcon],
    'lock': ['Impossible to change', lockIcon],
  };

  /// Set up the stores
  /** @type {ConstraintRatingFormConfig} */
  let constraintRatingFormConfig = null;

  /** @type {Object.<string, any>}*/
  const constraintRatingMap = {};
  let emptyReason = '';

  /** @type {Constraints} */
  let constraints = null;
  let constraintList = [];

  constraintsStore.subscribe(value => {
    constraints = value;
  });

  constraintRatingFormConfigStore.subscribe(value => {
    constraintRatingFormConfig = value;

    if (constraintRatingFormConfig.show) {
      constraintList = getConstraintList(constraints);

      // Initialize the rating map
      constraintList.forEach(c => {
        constraintRatingMap[c.featureName] = {
          difficulty: c.difficulty === undefined ? '-1' : '0',
          acceptableRange: c.acceptableRange === undefined ? '-1': '0'
        };
      });
    }
  });

  /**
   * Return true if users can submit the rating form
   * @param {Object.<string, any>} constraintRatingMap
   * @param {string} emptyReason
   */
  const canSubmit = (constraintRatingMap, emptyReason) => {
    let canSubmit = true;

    Object.keys(constraintRatingMap).forEach((featureName) => {
      if (constraintRatingMap[featureName].difficulty === '0') {
        canSubmit = false;
      }

      if (constraintRatingMap[featureName].acceptableRange === '0') {
        canSubmit = false;
      }
    });

    if (Object.keys(constraintRatingMap).length === 0 && emptyReason === '') {
      canSubmit = false;
    }

    return canSubmit;
  };

  const cancelClicked = () => {
    constraintRatingFormConfig.show = false;
    constraintRatingFormConfigStore.set(constraintRatingFormConfig);
  };

  const confirmClicked = () => {
    if (!canSubmit(constraintRatingMap, emptyReason)) {
      return;
    }

    // Convert local ratings to store
    constraintRatingFormConfig.constraintRatings = [];

    Object.keys(constraintRatingMap).forEach(featureName => {
      /** @type {ConstraintRating} */
      const constraintRating = {
        featureName,
        difficultyRating: constraintRatingMap[featureName].difficulty,
        rangeRating: constraintRatingMap[featureName].acceptableRange,
        emptyReason: ''
      };
      constraintRatingFormConfig.constraintRatings.push(constraintRating);
    });

    if (emptyReason !== '') {
      constraintRatingFormConfig.constraintRatings.push( {
        featureName: '',
        difficultyRating: '0',
        rangeRating: '0',
        emptyReason: emptyReason
      });
    }

    // Tell the parent that all plans are rated
    constraintRatingFormConfig.action = 'proceed';
    constraintRatingFormConfig.show = false;
    constraintRatingFormConfigStore.set(constraintRatingFormConfig);
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];
    bindInlineSVG(component, iconList);
  });

</script>

<style lang="scss">
  @import './ConstraintRatingForm.scss';
</style>

<div class='input-form-back'
  class:no-display={!constraintRatingFormConfig.show}
>
</div>

<div class='input-form'
  tabIndex='0'
  bind:this={component}
  class:no-display={!constraintRatingFormConfig.show}
>

  <div class='header'>
    <span class='title'>Review Your Preferences</span>

    <div class='svg-icon icon-close'
      on:click={() => cancelClicked()}
    ></div>
  </div>

  <div class='content'>
    {#if constraintList.length === 0}
      <span>
        You <strong>did not set any preferences</strong> (difficulty or acceptable range of features). It means
        that all features have the same difficulty for you to change, and GAM Coach
        can suggest any feature values for you.
      </span>

      <label for='empty-reason'>Explain why you chose not to set any preferences.
        Your explanation should emphasize why setting preferences is not helpful
        or necessary <strong>in your case</strong>.
      </label>
      <textarea id='empty-reason' placeholder='I did not set any preferences, because...'
        bind:value={emptyReason}
      ></textarea>

    {:else}
      <span class='label'>How important is each specified preference?</span>
      {#each constraintList as constraint}
        <div class='constraint-row'>
          <div class='constraint-name'>
            {constraint.displayName}
          </div>

          {#if constraint.difficulty !== undefined}
            <div class='constraint-item'>
              <div class='constraint-item-name difficulty'>
                Difficulty: <span class='svg-icon'>{@html difficultyMap[constraint.difficulty][1]}</span>
                {difficultyMap[constraint.difficulty][0]}
              </div>
              <div class='constraint-rating'>
                <select class='rating-select' bind:value={constraintRatingMap[constraint.featureName].difficulty}>
                  <option value='0'>Select an Importance Score</option>
                  <option value='1'>1 - Somewhat Important</option>
                  <option value='2'>2 - Fairly Important</option>
                  <option value='3'>3 - Very Important</option>
                </select>
              </div>
            </div>
          {/if}

          {#if constraint.acceptableRange !== undefined}
            <div class='constraint-item'>
              <div class='constraint-item-name'>
                Acceptable range: {constraint.acceptableRangeText}
              </div>
              <div class='constraint-rating'>
                <select class='rating-select' bind:value={constraintRatingMap[constraint.featureName].acceptableRange}>
                  <option value='0'>Select an Importance Score</option>
                  <option value='1'>1 - Somewhat Important</option>
                  <option value='2'>2 - Fairly Important</option>
                  <option value='3'>3 - Very Important</option>
                </select>
              </div>
            </div>
          {/if}

        </div>
      {/each}

    {/if}
  </div>

  <div class='control'>

    <div class='error-message' class:out-range={!canSubmit(constraintRatingMap, emptyReason)}>
      Complete all fields to proceed or go back
    </div>

    <div class='button button-cancel'
      on:click={() => cancelClicked()}
    >
      Back
    </div>

    <div class='button button-confirm'
      class:out-range={!canSubmit(constraintRatingMap, emptyReason)}
      on:click={() => confirmClicked()}
    >
      Next
    </div>

  </div>
</div>
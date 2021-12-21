
/**
 * @typedef {Object} LogValue A value that an interaction event changes
 * @property {string} name Value name
 * @property {string | number} value Value
 */

/**
 * @typedef {Object} Log A single event log
 * @property {string} eventName A string from ['click', 'dragEnd',
 *  'mouseEnter', 'mouseLeave']
 * @property {string} elementName Name of element that handles the event
 * @property {Date} time Timestamp for the event
 * @property {LogValue | null} oldValue The old value that this interaction
 *  changes from
 * @property {LogValue | null} newValue The new value that this interaction
 *  changes to
 */


/**
 * An object to log interaction events.
 */
export class Logger {
  /**
   * Initialize a new Logger object.
   * @param {any} [initialValues] Any objects to store with the logger
   */
  constructor(initialValues = null) {
    /** @type{Log[]} */
    this.log = [];

    this.initialValues = initialValues;

    /** @type{Date} */
    this.startTime = new Date();

    // Create a map to register any object on the fly
    /** @type {Map<string, any>} */
    this.record = new Map();
  }

  /**
   * Add a new log event
   * @param {object} obj Smart parameter
   * @param {string} obj.eventName A string from ['click', 'dragEnd',
   *  'mouseEnter', 'mouseLeave'] or any other given name
   * @param {string} obj.elementName Name of the element that users interact
   *  with
   * @param {Date | null} [obj.time] Timestamp for the event
   * @param {string | null} [obj.valueName] Name of the given value
   * @param {string | number | null | number[]} [obj.oldValue] Old value that
   *  this interaction changes from
   * @param {string | number | null | number[]} [obj.newValue] New value that
   *  this interaction changes to
   */
  addLog({
    eventName,
    elementName,
    time = null,
    valueName = null,
    oldValue = null,
    newValue = null
  }) {
    // Create a time stamp if it is not given
    const timeStamp = time !== null ? time : new Date();

    // Create value objects if they are given

    /** @type {LogValue} */
    let oldValueObj = null;

    /** @type {LogValue} */
    let newValueObj = null;

    if (valueName !== null) {
      if (oldValue !== null) {
        oldValueObj = {
          name: valueName,
          value: oldValue
        };
      }
      if (newValue !== null) {
        newValueObj = {
          name: valueName,
          value: newValue
        };
      }
    }

    // Create a new Log object
    /** @type {Log} */
    const newLog = {
      eventName,
      elementName,
      time: timeStamp,
      oldValue: oldValueObj,
      newValue: newValueObj
    };

    this.log.push(newLog);
  }

  /**
   * Export the logs as a JSON string.
   * @param {any} [endValues] Any values to exported with the log
   */
  toJSON(endValues = null) {
    const exportLog = {
      log: this.log,
      startTime: this.startTime,
      endTime: new Date(),
      initialValues: this.initialValues,
      endValues: endValues,
      record: Array.from(this.record.entries())
    };
    return JSON.stringify(exportLog);
  }

  /**
   * Overwrite the initial values
   * @param {any} initialValues
   */
  setInitialValues(initialValues) {
    this.initialValues = initialValues;
  }

  /**
   * Add a key value pair to the internal record map.
   * @param {string} key Key name
   * @param {any} value Any serializable object
   */
  addRecord(key, value) {
    this.record.set(key, value);
  }
}
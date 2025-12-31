/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.telemetry = (function() {

    /**
     * Namespace telemetry.
     * @exports telemetry
     * @namespace
     */
    var telemetry = {};

    telemetry.MouseEvent = (function() {

        /**
         * Properties of a MouseEvent.
         * @memberof telemetry
         * @interface IMouseEvent
         * @property {number|null} [x] MouseEvent x
         * @property {number|null} [y] MouseEvent y
         * @property {number|Long|null} [timestamp] MouseEvent timestamp
         * @property {telemetry.MouseEvent.Type|null} [type] MouseEvent type
         */

        /**
         * Constructs a new MouseEvent.
         * @memberof telemetry
         * @classdesc Represents a MouseEvent.
         * @implements IMouseEvent
         * @constructor
         * @param {telemetry.IMouseEvent=} [properties] Properties to set
         */
        function MouseEvent(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * MouseEvent x.
         * @member {number} x
         * @memberof telemetry.MouseEvent
         * @instance
         */
        MouseEvent.prototype.x = 0;

        /**
         * MouseEvent y.
         * @member {number} y
         * @memberof telemetry.MouseEvent
         * @instance
         */
        MouseEvent.prototype.y = 0;

        /**
         * MouseEvent timestamp.
         * @member {number|Long} timestamp
         * @memberof telemetry.MouseEvent
         * @instance
         */
        MouseEvent.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * MouseEvent type.
         * @member {telemetry.MouseEvent.Type} type
         * @memberof telemetry.MouseEvent
         * @instance
         */
        MouseEvent.prototype.type = 0;

        /**
         * Creates a new MouseEvent instance using the specified properties.
         * @function create
         * @memberof telemetry.MouseEvent
         * @static
         * @param {telemetry.IMouseEvent=} [properties] Properties to set
         * @returns {telemetry.MouseEvent} MouseEvent instance
         */
        MouseEvent.create = function create(properties) {
            return new MouseEvent(properties);
        };

        /**
         * Encodes the specified MouseEvent message. Does not implicitly {@link telemetry.MouseEvent.verify|verify} messages.
         * @function encode
         * @memberof telemetry.MouseEvent
         * @static
         * @param {telemetry.IMouseEvent} message MouseEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MouseEvent.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.x);
            if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.y);
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.timestamp);
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.type);
            return writer;
        };

        /**
         * Encodes the specified MouseEvent message, length delimited. Does not implicitly {@link telemetry.MouseEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof telemetry.MouseEvent
         * @static
         * @param {telemetry.IMouseEvent} message MouseEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MouseEvent.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a MouseEvent message from the specified reader or buffer.
         * @function decode
         * @memberof telemetry.MouseEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {telemetry.MouseEvent} MouseEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MouseEvent.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.telemetry.MouseEvent();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.x = reader.int32();
                        break;
                    }
                case 2: {
                        message.y = reader.int32();
                        break;
                    }
                case 3: {
                        message.timestamp = reader.int64();
                        break;
                    }
                case 4: {
                        message.type = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a MouseEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof telemetry.MouseEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {telemetry.MouseEvent} MouseEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MouseEvent.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a MouseEvent message.
         * @function verify
         * @memberof telemetry.MouseEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        MouseEvent.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.x != null && message.hasOwnProperty("x"))
                if (!$util.isInteger(message.x))
                    return "x: integer expected";
            if (message.y != null && message.hasOwnProperty("y"))
                if (!$util.isInteger(message.y))
                    return "y: integer expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
            return null;
        };

        /**
         * Creates a MouseEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof telemetry.MouseEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {telemetry.MouseEvent} MouseEvent
         */
        MouseEvent.fromObject = function fromObject(object) {
            if (object instanceof $root.telemetry.MouseEvent)
                return object;
            var message = new $root.telemetry.MouseEvent();
            if (object.x != null)
                message.x = object.x | 0;
            if (object.y != null)
                message.y = object.y | 0;
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "MOVE":
            case 0:
                message.type = 0;
                break;
            case "CLICK":
            case 1:
                message.type = 1;
                break;
            case "RAGE_CLICK":
            case 2:
                message.type = 2;
                break;
            case "HESITATION":
            case 3:
                message.type = 3;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a MouseEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof telemetry.MouseEvent
         * @static
         * @param {telemetry.MouseEvent} message MouseEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        MouseEvent.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.x = 0;
                object.y = 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                object.type = options.enums === String ? "MOVE" : 0;
            }
            if (message.x != null && message.hasOwnProperty("x"))
                object.x = message.x;
            if (message.y != null && message.hasOwnProperty("y"))
                object.y = message.y;
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.telemetry.MouseEvent.Type[message.type] === undefined ? message.type : $root.telemetry.MouseEvent.Type[message.type] : message.type;
            return object;
        };

        /**
         * Converts this MouseEvent to JSON.
         * @function toJSON
         * @memberof telemetry.MouseEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        MouseEvent.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for MouseEvent
         * @function getTypeUrl
         * @memberof telemetry.MouseEvent
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        MouseEvent.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/telemetry.MouseEvent";
        };

        /**
         * Type enum.
         * @name telemetry.MouseEvent.Type
         * @enum {number}
         * @property {number} MOVE=0 MOVE value
         * @property {number} CLICK=1 CLICK value
         * @property {number} RAGE_CLICK=2 RAGE_CLICK value
         * @property {number} HESITATION=3 HESITATION value
         */
        MouseEvent.Type = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "MOVE"] = 0;
            values[valuesById[1] = "CLICK"] = 1;
            values[valuesById[2] = "RAGE_CLICK"] = 2;
            values[valuesById[3] = "HESITATION"] = 3;
            return values;
        })();

        return MouseEvent;
    })();

    telemetry.TelemetryBatch = (function() {

        /**
         * Properties of a TelemetryBatch.
         * @memberof telemetry
         * @interface ITelemetryBatch
         * @property {string|null} [sessionId] TelemetryBatch sessionId
         * @property {string|null} [userId] TelemetryBatch userId
         * @property {Array.<telemetry.IMouseEvent>|null} [events] TelemetryBatch events
         */

        /**
         * Constructs a new TelemetryBatch.
         * @memberof telemetry
         * @classdesc Represents a TelemetryBatch.
         * @implements ITelemetryBatch
         * @constructor
         * @param {telemetry.ITelemetryBatch=} [properties] Properties to set
         */
        function TelemetryBatch(properties) {
            this.events = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TelemetryBatch sessionId.
         * @member {string} sessionId
         * @memberof telemetry.TelemetryBatch
         * @instance
         */
        TelemetryBatch.prototype.sessionId = "";

        /**
         * TelemetryBatch userId.
         * @member {string} userId
         * @memberof telemetry.TelemetryBatch
         * @instance
         */
        TelemetryBatch.prototype.userId = "";

        /**
         * TelemetryBatch events.
         * @member {Array.<telemetry.IMouseEvent>} events
         * @memberof telemetry.TelemetryBatch
         * @instance
         */
        TelemetryBatch.prototype.events = $util.emptyArray;

        /**
         * Creates a new TelemetryBatch instance using the specified properties.
         * @function create
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {telemetry.ITelemetryBatch=} [properties] Properties to set
         * @returns {telemetry.TelemetryBatch} TelemetryBatch instance
         */
        TelemetryBatch.create = function create(properties) {
            return new TelemetryBatch(properties);
        };

        /**
         * Encodes the specified TelemetryBatch message. Does not implicitly {@link telemetry.TelemetryBatch.verify|verify} messages.
         * @function encode
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {telemetry.ITelemetryBatch} message TelemetryBatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TelemetryBatch.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sessionId != null && Object.hasOwnProperty.call(message, "sessionId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
            if (message.userId != null && Object.hasOwnProperty.call(message, "userId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.userId);
            if (message.events != null && message.events.length)
                for (var i = 0; i < message.events.length; ++i)
                    $root.telemetry.MouseEvent.encode(message.events[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified TelemetryBatch message, length delimited. Does not implicitly {@link telemetry.TelemetryBatch.verify|verify} messages.
         * @function encodeDelimited
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {telemetry.ITelemetryBatch} message TelemetryBatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TelemetryBatch.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TelemetryBatch message from the specified reader or buffer.
         * @function decode
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {telemetry.TelemetryBatch} TelemetryBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TelemetryBatch.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.telemetry.TelemetryBatch();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.sessionId = reader.string();
                        break;
                    }
                case 2: {
                        message.userId = reader.string();
                        break;
                    }
                case 3: {
                        if (!(message.events && message.events.length))
                            message.events = [];
                        message.events.push($root.telemetry.MouseEvent.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TelemetryBatch message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {telemetry.TelemetryBatch} TelemetryBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TelemetryBatch.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TelemetryBatch message.
         * @function verify
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TelemetryBatch.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sessionId != null && message.hasOwnProperty("sessionId"))
                if (!$util.isString(message.sessionId))
                    return "sessionId: string expected";
            if (message.userId != null && message.hasOwnProperty("userId"))
                if (!$util.isString(message.userId))
                    return "userId: string expected";
            if (message.events != null && message.hasOwnProperty("events")) {
                if (!Array.isArray(message.events))
                    return "events: array expected";
                for (var i = 0; i < message.events.length; ++i) {
                    var error = $root.telemetry.MouseEvent.verify(message.events[i]);
                    if (error)
                        return "events." + error;
                }
            }
            return null;
        };

        /**
         * Creates a TelemetryBatch message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {telemetry.TelemetryBatch} TelemetryBatch
         */
        TelemetryBatch.fromObject = function fromObject(object) {
            if (object instanceof $root.telemetry.TelemetryBatch)
                return object;
            var message = new $root.telemetry.TelemetryBatch();
            if (object.sessionId != null)
                message.sessionId = String(object.sessionId);
            if (object.userId != null)
                message.userId = String(object.userId);
            if (object.events) {
                if (!Array.isArray(object.events))
                    throw TypeError(".telemetry.TelemetryBatch.events: array expected");
                message.events = [];
                for (var i = 0; i < object.events.length; ++i) {
                    if (typeof object.events[i] !== "object")
                        throw TypeError(".telemetry.TelemetryBatch.events: object expected");
                    message.events[i] = $root.telemetry.MouseEvent.fromObject(object.events[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a TelemetryBatch message. Also converts values to other types if specified.
         * @function toObject
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {telemetry.TelemetryBatch} message TelemetryBatch
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TelemetryBatch.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.events = [];
            if (options.defaults) {
                object.sessionId = "";
                object.userId = "";
            }
            if (message.sessionId != null && message.hasOwnProperty("sessionId"))
                object.sessionId = message.sessionId;
            if (message.userId != null && message.hasOwnProperty("userId"))
                object.userId = message.userId;
            if (message.events && message.events.length) {
                object.events = [];
                for (var j = 0; j < message.events.length; ++j)
                    object.events[j] = $root.telemetry.MouseEvent.toObject(message.events[j], options);
            }
            return object;
        };

        /**
         * Converts this TelemetryBatch to JSON.
         * @function toJSON
         * @memberof telemetry.TelemetryBatch
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TelemetryBatch.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TelemetryBatch
         * @function getTypeUrl
         * @memberof telemetry.TelemetryBatch
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TelemetryBatch.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/telemetry.TelemetryBatch";
        };

        return TelemetryBatch;
    })();

    return telemetry;
})();

module.exports = $root;

import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace telemetry. */
export namespace telemetry {

    /** Properties of a MouseEvent. */
    interface IMouseEvent {

        /** MouseEvent x */
        x?: (number|null);

        /** MouseEvent y */
        y?: (number|null);

        /** MouseEvent timestamp */
        timestamp?: (number|Long|null);

        /** MouseEvent type */
        type?: (telemetry.MouseEvent.Type|null);
    }

    /** Represents a MouseEvent. */
    class MouseEvent implements IMouseEvent {

        /**
         * Constructs a new MouseEvent.
         * @param [properties] Properties to set
         */
        constructor(properties?: telemetry.IMouseEvent);

        /** MouseEvent x. */
        public x: number;

        /** MouseEvent y. */
        public y: number;

        /** MouseEvent timestamp. */
        public timestamp: (number|Long);

        /** MouseEvent type. */
        public type: telemetry.MouseEvent.Type;

        /**
         * Creates a new MouseEvent instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MouseEvent instance
         */
        public static create(properties?: telemetry.IMouseEvent): telemetry.MouseEvent;

        /**
         * Encodes the specified MouseEvent message. Does not implicitly {@link telemetry.MouseEvent.verify|verify} messages.
         * @param message MouseEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: telemetry.IMouseEvent, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified MouseEvent message, length delimited. Does not implicitly {@link telemetry.MouseEvent.verify|verify} messages.
         * @param message MouseEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: telemetry.IMouseEvent, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a MouseEvent message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MouseEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): telemetry.MouseEvent;

        /**
         * Decodes a MouseEvent message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns MouseEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): telemetry.MouseEvent;

        /**
         * Verifies a MouseEvent message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a MouseEvent message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns MouseEvent
         */
        public static fromObject(object: { [k: string]: any }): telemetry.MouseEvent;

        /**
         * Creates a plain object from a MouseEvent message. Also converts values to other types if specified.
         * @param message MouseEvent
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: telemetry.MouseEvent, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this MouseEvent to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for MouseEvent
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace MouseEvent {

        /** Type enum. */
        enum Type {
            MOVE = 0,
            CLICK = 1,
            RAGE_CLICK = 2,
            HESITATION = 3
        }
    }

    /** Properties of a TelemetryBatch. */
    interface ITelemetryBatch {

        /** TelemetryBatch sessionId */
        sessionId?: (string|null);

        /** TelemetryBatch userId */
        userId?: (string|null);

        /** TelemetryBatch events */
        events?: (telemetry.IMouseEvent[]|null);
    }

    /** Represents a TelemetryBatch. */
    class TelemetryBatch implements ITelemetryBatch {

        /**
         * Constructs a new TelemetryBatch.
         * @param [properties] Properties to set
         */
        constructor(properties?: telemetry.ITelemetryBatch);

        /** TelemetryBatch sessionId. */
        public sessionId: string;

        /** TelemetryBatch userId. */
        public userId: string;

        /** TelemetryBatch events. */
        public events: telemetry.IMouseEvent[];

        /**
         * Creates a new TelemetryBatch instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TelemetryBatch instance
         */
        public static create(properties?: telemetry.ITelemetryBatch): telemetry.TelemetryBatch;

        /**
         * Encodes the specified TelemetryBatch message. Does not implicitly {@link telemetry.TelemetryBatch.verify|verify} messages.
         * @param message TelemetryBatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: telemetry.ITelemetryBatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TelemetryBatch message, length delimited. Does not implicitly {@link telemetry.TelemetryBatch.verify|verify} messages.
         * @param message TelemetryBatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: telemetry.ITelemetryBatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TelemetryBatch message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TelemetryBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): telemetry.TelemetryBatch;

        /**
         * Decodes a TelemetryBatch message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TelemetryBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): telemetry.TelemetryBatch;

        /**
         * Verifies a TelemetryBatch message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TelemetryBatch message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TelemetryBatch
         */
        public static fromObject(object: { [k: string]: any }): telemetry.TelemetryBatch;

        /**
         * Creates a plain object from a TelemetryBatch message. Also converts values to other types if specified.
         * @param message TelemetryBatch
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: telemetry.TelemetryBatch, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TelemetryBatch to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TelemetryBatch
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

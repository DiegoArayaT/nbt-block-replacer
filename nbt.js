/**
 * NBT & Schematic Engine for Web (Client-side)
 * Supports Vanilla Structure Blocks (.nbt) and Sponge Schematics (.schem)
 * Works standalone via file:// or http:// with zero external dependencies.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.NBTEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const TAG_END = 0;
    const TAG_BYTE = 1;
    const TAG_SHORT = 2;
    const TAG_INT = 3;
    const TAG_LONG = 4;
    const TAG_FLOAT = 5;
    const TAG_DOUBLE = 6;
    const TAG_BYTE_ARRAY = 7;
    const TAG_STRING = 8;
    const TAG_LIST = 9;
    const TAG_COMPOUND = 10;
    const TAG_INT_ARRAY = 11;
    const TAG_LONG_ARRAY = 12;

    class NBTReader {
        constructor(buffer) {
            this.buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
            this.offset = 0;
            this.view = new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength);
            this.decoder = new TextDecoder('utf-8');
        }

        readByte() { return this.view.getInt8(this.offset++); }
        readUByte() { return this.view.getUint8(this.offset++); }
        readShort() { const v = this.view.getInt16(this.offset); this.offset += 2; return v; }
        readInt() { const v = this.view.getInt32(this.offset); this.offset += 4; return v; }
        readLong() { const v = this.view.getBigInt64(this.offset); this.offset += 8; return v; }
        readFloat() { const v = this.view.getFloat32(this.offset); this.offset += 4; return v; }
        readDouble() { const v = this.view.getFloat64(this.offset); this.offset += 8; return v; }

        readString() {
            const len = this.view.getUint16(this.offset);
            this.offset += 2;
            const bytes = this.buf.subarray(this.offset, this.offset + len);
            this.offset += len;
            return this.decoder.decode(bytes);
        }

        readTag(type) {
            switch (type) {
                case TAG_BYTE: return { type, value: this.readByte() };
                case TAG_SHORT: return { type, value: this.readShort() };
                case TAG_INT: return { type, value: this.readInt() };
                case TAG_LONG: return { type, value: this.readLong() };
                case TAG_FLOAT: return { type, value: this.readFloat() };
                case TAG_DOUBLE: return { type, value: this.readDouble() };
                case TAG_BYTE_ARRAY: {
                    const len = this.readInt();
                    const arr = this.buf.slice(this.offset, this.offset + len);
                    this.offset += len;
                    return { type, value: arr };
                }
                case TAG_STRING: return { type, value: this.readString() };
                case TAG_LIST: {
                    const itemType = this.readByte();
                    const len = this.readInt();
                    const list = [];
                    for (let i = 0; i < len; i++) {
                        list.push(this.readTag(itemType));
                    }
                    return { type, itemType, value: list };
                }
                case TAG_COMPOUND: {
                    const comp = {};
                    while (true) {
                        const t = this.readByte();
                        if (t === TAG_END) break;
                        const name = this.readString();
                        comp[name] = this.readTag(t);
                    }
                    return { type, value: comp };
                }
                case TAG_INT_ARRAY: {
                    const len = this.readInt();
                    const arr = [];
                    for (let i = 0; i < len; i++) arr.push(this.readInt());
                    return { type, value: arr };
                }
                case TAG_LONG_ARRAY: {
                    const len = this.readInt();
                    const arr = [];
                    for (let i = 0; i < len; i++) arr.push(this.readLong());
                    return { type, value: arr };
                }
                default:
                    throw new Error(`Unknown NBT Tag Type: ${type} at offset ${this.offset}`);
            }
        }

        readRoot() {
            const rootType = this.readByte();
            if (rootType !== TAG_COMPOUND) throw new Error("Root NBT tag must be Compound");
            const rootName = this.readString();
            const rootVal = this.readTag(TAG_COMPOUND);
            return { name: rootName, ...rootVal };
        }
    }

    class NBTWriter {
        constructor() {
            this.buffers = [];
            this.encoder = new TextEncoder();
        }

        writeByte(v) {
            const u = new Uint8Array(1);
            new DataView(u.buffer).setInt8(0, v);
            this.buffers.push(u);
        }

        writeShort(v) {
            const u = new Uint8Array(2);
            new DataView(u.buffer).setInt16(0, v);
            this.buffers.push(u);
        }

        writeInt(v) {
            const u = new Uint8Array(4);
            new DataView(u.buffer).setInt32(0, v);
            this.buffers.push(u);
        }

        writeLong(v) {
            const u = new Uint8Array(8);
            new DataView(u.buffer).setBigInt64(0, BigInt(v));
            this.buffers.push(u);
        }

        writeFloat(v) {
            const u = new Uint8Array(4);
            new DataView(u.buffer).setFloat32(0, v);
            this.buffers.push(u);
        }

        writeDouble(v) {
            const u = new Uint8Array(8);
            new DataView(u.buffer).setFloat64(0, v);
            this.buffers.push(u);
        }

        writeString(str) {
            const bytes = this.encoder.encode(str);
            this.writeShort(bytes.length);
            this.buffers.push(bytes);
        }

        writeTag(tag) {
            switch (tag.type) {
                case TAG_BYTE: this.writeByte(tag.value); break;
                case TAG_SHORT: this.writeShort(tag.value); break;
                case TAG_INT: this.writeInt(tag.value); break;
                case TAG_LONG: this.writeLong(tag.value); break;
                case TAG_FLOAT: this.writeFloat(tag.value); break;
                case TAG_DOUBLE: this.writeDouble(tag.value); break;
                case TAG_BYTE_ARRAY: {
                    const arr = tag.value instanceof Uint8Array ? tag.value : new Uint8Array(tag.value);
                    this.writeInt(arr.length);
                    this.buffers.push(arr);
                    break;
                }
                case TAG_STRING: this.writeString(tag.value); break;
                case TAG_LIST: {
                    this.writeByte(tag.itemType);
                    this.writeInt(tag.value.length);
                    for (const item of tag.value) {
                        this.writeTag(item);
                    }
                    break;
                }
                case TAG_COMPOUND: {
                    for (const [name, childTag] of Object.entries(tag.value)) {
                        this.writeByte(childTag.type);
                        this.writeString(name);
                        this.writeTag(childTag);
                    }
                    this.writeByte(TAG_END);
                    break;
                }
                case TAG_INT_ARRAY: {
                    this.writeInt(tag.value.length);
                    for (const val of tag.value) this.writeInt(val);
                    break;
                }
                case TAG_LONG_ARRAY: {
                    this.writeInt(tag.value.length);
                    for (const val of tag.value) this.writeLong(val);
                    break;
                }
                default:
                    throw new Error(`Cannot write tag type: ${tag.type}`);
            }
        }

        writeRoot(root) {
            this.writeByte(TAG_COMPOUND);
            this.writeString(root.name || "");
            this.writeTag(root);

            let totalLen = 0;
            for (const b of this.buffers) totalLen += b.byteLength;
            const merged = new Uint8Array(totalLen);
            let offset = 0;
            for (const b of this.buffers) {
                merged.set(b, offset);
                offset += b.byteLength;
            }
            return merged;
        }
    }

    /**
     * Decompress GZIP ArrayBuffer using native DecompressionStream
     */
    async function decompressGzip(buffer) {
        const u8 = new Uint8Array(buffer);
        // Check gzip magic bytes (0x1f, 0x8b)
        if (u8[0] === 0x1f && u8[1] === 0x8b) {
            if (typeof DecompressionStream !== 'undefined') {
                const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
                return new Uint8Array(await new Response(stream).arrayBuffer());
            } else if (typeof require !== 'undefined') {
                const zlib = require('zlib');
                return new Uint8Array(zlib.gunzipSync(Buffer.from(buffer)));
            } else {
                throw new Error("El navegador no soporta DecompressionStream nativo.");
            }
        }
        return u8;
    }

    /**
     * Compress Uint8Array into GZIP ArrayBuffer using native CompressionStream
     */
    async function compressGzip(u8Array) {
        if (typeof CompressionStream !== 'undefined') {
            const stream = new Blob([u8Array]).stream().pipeThrough(new CompressionStream('gzip'));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        } else if (typeof require !== 'undefined') {
            const zlib = require('zlib');
            return new Uint8Array(zlib.gzipSync(Buffer.from(u8Array)));
        } else {
            return u8Array;
        }
    }

    /**
     * High-level Structure Parser
     */
    class StructureFile {
        constructor(rawNbt, filename) {
            this.raw = rawNbt;
            this.filename = filename || 'structure.nbt';
            this.format = 'unknown'; // 'vanilla_nbt' | 'sponge_schem'
            this.size = { x: 0, y: 0, z: 0 };
            this.palette = [];
            this.totalBlocks = 0;

            this.analyze();
        }

        analyze() {
            const v = this.raw.value;

            // 1. Vanilla Structure Block format
            if (v.palette && v.blocks) {
                this.format = 'vanilla_nbt';
                if (v.size && v.size.value && v.size.value.length === 3) {
                    this.size = {
                        x: v.size.value[0].value,
                        y: v.size.value[1].value,
                        z: v.size.value[2].value
                    };
                }

                const blockList = v.blocks.value;
                this.totalBlocks = blockList.length;
                const counts = new Map();
                for (const b of blockList) {
                    const stateIdx = b.value.state.value;
                    counts.set(stateIdx, (counts.get(stateIdx) || 0) + 1);
                }

                const palList = v.palette.value;
                this.palette = palList.map((entry, idx) => {
                    const blockObj = entry.value;
                    const name = blockObj.Name ? blockObj.Name.value : 'unknown';
                    const props = {};
                    if (blockObj.Properties && blockObj.Properties.value) {
                        for (const [pk, pv] of Object.entries(blockObj.Properties.value)) {
                            props[pk] = pv.value;
                        }
                    }
                    return {
                        id: idx,
                        name,
                        properties: props,
                        count: counts.get(idx) || 0,
                        originalRef: entry
                    };
                });
            }
            // 2. Sponge Schematic format (.schem)
            else if (v.Schematic && v.Schematic.value) {
                this.format = 'sponge_schem';
                const schem = v.Schematic.value;
                this.size = {
                    x: schem.Width ? schem.Width.value : 0,
                    y: schem.Height ? schem.Height.value : 0,
                    z: schem.Length ? schem.Length.value : 0
                };

                let palObj = null;
                if (schem.Blocks && schem.Blocks.value && schem.Blocks.value.Palette) {
                    palObj = schem.Blocks.value.Palette.value;
                } else if (schem.Palette) {
                    palObj = schem.Palette.value;
                }

                if (palObj) {
                    this.palette = Object.entries(palObj).map(([blockStateStr, idTag], idx) => {
                        let name = blockStateStr;
                        const props = {};
                        const bracketIdx = blockStateStr.indexOf('[');
                        if (bracketIdx !== -1) {
                            name = blockStateStr.substring(0, bracketIdx);
                            const propsStr = blockStateStr.substring(bracketIdx + 1, blockStateStr.length - 1);
                            for (const pair of propsStr.split(',')) {
                                const [k, val] = pair.split('=');
                                if (k && val) props[k.trim()] = val.trim();
                            }
                        }
                        return {
                            id: idTag.value,
                            name,
                            properties: props,
                            fullString: blockStateStr,
                            count: 1,
                            originalRef: { palObj, key: blockStateStr, idTag }
                        };
                    });
                    this.totalBlocks = this.size.x * this.size.y * this.size.z;
                }
            } else {
                throw new Error("Formato NBT no reconocido. No parece ser una estructura de Minecraft (.nbt o .schem).");
            }
        }

        applyReplacements(rules) {
            let totalReplacedBlocks = 0;
            let modifiedEntriesCount = 0;

            if (this.format === 'vanilla_nbt') {
                for (const rule of rules) {
                    const fromId = rule.from.trim();
                    const toId = rule.to.trim();
                    if (!fromId || !toId) continue;

                    for (const palItem of this.palette) {
                        if (palItem.name === fromId) {
                            palItem.originalRef.value.Name.value = toId;
                            palItem.name = toId;
                            modifiedEntriesCount++;
                            totalReplacedBlocks += palItem.count;

                            if (!rule.keepProps) {
                                delete palItem.originalRef.value.Properties;
                                palItem.properties = {};
                            }
                        }
                    }
                }
            } else if (this.format === 'sponge_schem') {
                const schem = this.raw.value.Schematic.value;
                const palTag = schem.Blocks && schem.Blocks.value && schem.Blocks.value.Palette
                    ? schem.Blocks.value.Palette
                    : schem.Palette;

                if (palTag && palTag.value) {
                    const newPalValue = {};
                    for (const [key, idTag] of Object.entries(palTag.value)) {
                        let newKey = key;
                        for (const rule of rules) {
                            const fromId = rule.from.trim();
                            const toId = rule.to.trim();
                            if (key.startsWith(fromId)) {
                                if (rule.keepProps) {
                                    newKey = key.replace(fromId, toId);
                                } else {
                                    newKey = toId;
                                }
                                modifiedEntriesCount++;
                                totalReplacedBlocks += 1;
                                break;
                            }
                        }
                        newPalValue[newKey] = idTag;
                    }
                    palTag.value = newPalValue;
                    this.analyze();
                }
            }

            return { totalReplacedBlocks, modifiedEntriesCount };
        }

        async exportGzipped() {
            const writer = new NBTWriter();
            const uncompressed = writer.writeRoot(this.raw);
            return await compressGzip(uncompressed);
        }
    }

    async function loadFromFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const decompressed = await decompressGzip(arrayBuffer);
        const reader = new NBTReader(decompressed);
        const rootNbt = reader.readRoot();
        return new StructureFile(rootNbt, file.name);
    }

    return {
        loadFromFile,
        NBTReader,
        NBTWriter,
        StructureFile,
        decompressGzip,
        compressGzip
    };
}));

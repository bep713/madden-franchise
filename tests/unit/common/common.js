import crypto from 'crypto';
import { expect } from 'chai';

let common = {};

common.hashCompare = (left, right) => {
    const leftHash = 
        crypto
            .createHash('sha1')
            .update(left)
            .digest();

    const rightHash =
        crypto
            .createHash('sha1')
            .update(right)
            .digest();

    expect(leftHash).to.eql(rightHash);
};

export default common;
import { PrivateKey, key, Aes, TransactionHelper } from 'bitsharesjs';

const ACTIVE_KEY_INDEX = 0;
const OWNER_KEY_INDEX = 1;

export const getBrainkey = state => {
  if (!state.aesPrivate) return null;
  return state.aesPrivate.decryptHexToText(state.encryptedBrainkey);
};

export const getKeys = state => {
  const brainkey = getBrainkey(state);
  if (!brainkey) return null;
  return {
    active: key.get_brainPrivateKey(brainkey, ACTIVE_KEY_INDEX),
    owner: key.get_brainPrivateKey(brainkey, OWNER_KEY_INDEX)
  };
};

export const isValidPassword = state => {
  return password => {
    const passwordPrivate = PrivateKey.fromSeed(password);
    const passwordPubkey = passwordPrivate.toPublicKey().toPublicKeyString();
    return passwordPubkey === state.passwordPubkey;
  };
};

export const isLocked = state => {
  return state.aesPrivate == null;
};

export const encryptMemo = state => {
  return (memo, toPubkey) => {
    const { active } = getKeys(state);
    const activePubkey = active.toPublicKey().toPublicKeyString();
    const nonce = TransactionHelper.unique_nonce_uint64();

    const message = Aes.encrypt_with_checksum(
      active,
      toPubkey,
      nonce,
      memo
    );

    return {
      from: activePubkey,
      to: toPubkey,
      nonce,
      message
    };
  };
};

export const signTransaction = state => {
  return async transaction => {
    const { active, owner } = getKeys(state);
    const pubkeys = [active, owner].map(privkey => privkey.toPublicKey().toPublicKeyString());
    const requiredPubkeys = await transaction.get_required_signatures(pubkeys);
    requiredPubkeys.forEach(requiredPubkey => {
      if (active.toPublicKey().toPublicKeyString() === requiredPubkey) {
        transaction.add_signer(active, requiredPubkey);
      }
      if (owner.toPublicKey().toPublicKeyString() === requiredPubkey) {
        transaction.add_signer(owner, requiredPubkey);
      }
    });
  };
};

export const getAccountError = state => {
  return state.error;
};

export const getAccountUserId = state => {
  return state.userId;
};

export const getAccountPendingState = state => {
  return state.pending;
};
import BigNumber from 'bignumber.js';
import { AccountRepr, JettonsBalances } from '../tonApi';

export const TONAsset = 'TON';

export function toNumberAmount(str: string): number {
  str = str.replaceAll(',', '');
  return parseFloat(str);
}
export function isNumeric(str: string) {
  str = str.replaceAll(',', '');
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

export const getJettonSymbol = (
  address: string,
  jettons: JettonsBalances
): string => {
  const jetton = jettons.balances.find(
    (item) => item.jettonAddress === address
  );
  return jetton?.metadata?.symbol ?? address;
};

export const getJettonDecimals = (
  address: string,
  jettons: JettonsBalances
): number => {
  const jetton = jettons.balances.find(
    (item) => item.jettonAddress === address
  );
  return jetton?.metadata?.decimals ?? 9;
};

export const getMaxValue = (
  jettons: JettonsBalances,
  info: AccountRepr | undefined,
  jetton: string,
  format: (amount: number | string, decimals?: number) => string
): string => {
  if (jetton === TONAsset) {
    return format(info?.balance ?? 0);
  }

  const jettonInfo = jettons.balances.find(
    (item) => item.jettonAddress === jetton
  );
  return format(jettonInfo?.balance ?? 0);
};

export const getRemaining = (
  jettons: JettonsBalances,
  info: AccountRepr | undefined,
  jetton: string,
  amount: string,
  max: boolean,
  format: (amount: number | string, decimals?: number) => string
): [string, boolean] => {
  if (jetton === TONAsset) {
    if (max) {
      return [`0 ${TONAsset}`, true];
    }

    const remaining = new BigNumber(info?.balance ?? 0).minus(
      isNumeric(amount)
        ? new BigNumber(toNumberAmount(amount)).multipliedBy(Math.pow(10, 9))
        : 0
    );

    return [
      `${format(remaining.toString())} ${TONAsset}`,
      remaining.isGreaterThan(0),
    ];
  }

  const jettonInfo = jettons.balances.find(
    (item) => item.jettonAddress === jetton
  );
  if (!jettonInfo) {
    return ['0', false];
  }

  if (max) {
    return [`0 ${jettonInfo.metadata?.symbol}`, true];
  }

  const remaining = new BigNumber(jettonInfo.balance).minus(
    isNumeric(amount)
      ? new BigNumber(toNumberAmount(amount)).multipliedBy(
          Math.pow(10, jettonInfo.metadata?.decimals ?? 9)
        )
      : 0
  );

  return [
    `${format(remaining.toString(), jettonInfo.metadata?.decimals)} ${
      jettonInfo.metadata?.symbol
    }`,
    remaining.isGreaterThan(0),
  ];
};

export const parseAndValidateInput = (
  value: string,
  jettons: JettonsBalances,
  jetton: string,
  format: (amount: number | string, decimals?: number) => string
): string | undefined => {
  if (value.trim() == '') return '';
  if (value.length > 22) return;
  try {
    const [entry, ...tail] = value.trim().replaceAll(',', '').split('.');
    if (entry.length > 11) return;
    const start = parseInt(entry, 10);

    if (isNaN(start)) {
      throw new Error('Not a number');
    }

    if (tail.length > 1) return;
    const decimals = getJettonDecimals(jetton, jettons);
    if (tail.length && tail[0].length > decimals) return;

    return [format(start, 0), ...tail].join('.');
  } catch (e) {
    return value;
  }
};
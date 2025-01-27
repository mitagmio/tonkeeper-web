import { QueryClient } from '@tanstack/react-query';
import { IAppSdk } from '@tonkeeper/core/dist/AppSdk';
import {
  seeIfBalanceError,
  seeIfTimeError,
} from '@tonkeeper/core/dist/service/transfer/common';
import { JettonsBalances } from '@tonkeeper/core/dist/tonApiV1';
import {
  getDecimalSeparator,
  getGroupSeparator,
} from '@tonkeeper/core/dist/utils/formatting';
import {
  getFiatAmountValue,
  getFiatPrice,
} from '@tonkeeper/core/dist/utils/send';
import BigNumber from 'bignumber.js';
import React, { PropsWithChildren, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { useAppContext } from '../../hooks/appContext';
import { formatFiatCurrency } from '../../hooks/balance';
import { cleanSyncDateBanner } from '../../state/syncDate';
import { useTonenpointStock } from '../../state/tonendpoint';
import { Body1 } from '../Text';

export const duration = 300;
export const timingFunction = 'ease-in-out';

const rightToLeft = 'right-to-left';
const leftToTight = 'left-to-right';

const ButtonBlockElement = styled.div<{ standalone: boolean }>`
  position: fixed;
  padding: 0 1rem;
  box-sizing: border-box;
  width: var(--app-width);

  &:after {
    content: '';
    position: absolute;
    width: 100%;
    left: 0;
    ${(props) =>
      props.standalone
        ? css`
            bottom: -2rem;
          `
        : css`
            bottom: -1rem;
          `}
    height: calc(100% + 2rem);
    z-index: -1;
    background: ${(props) => props.theme.gradientBackgroundBottom};
  }

  ${(props) =>
    props.standalone
      ? css`
          bottom: 2rem;
        `
      : css`
          bottom: 1rem;
        `}
`;

export const Wrapper = styled.div<{ standalone: boolean; extension: boolean }>`
  position: relative;
  overflow: hidden;
  ${(props) =>
    props.extension
      ? undefined
      : css`
          margin-bottom: -1rem;
        `}

  .${rightToLeft}-exit, .${leftToTight}-exit {
    position: absolute;
    inset: 0;
    transform: translateX(0);
    opacity: 1;
  }

  .${rightToLeft}-enter {
    transform: translateX(100%);
    opacity: 0;
  }
  .${rightToLeft}-enter-active {
    transform: translateX(0);
    opacity: 1;
    transition: transform ${duration}ms ${timingFunction},
      opacity ${duration / 2}ms ${timingFunction};
  }

  .${rightToLeft}-exit-active {
    transform: translateX(-100%);
    opacity: 0;
    transition: transform ${duration}ms ${timingFunction},
      opacity ${duration / 2}ms ${timingFunction};
  }

  .${leftToTight}-enter {
    transform: translateX(-100%);
    opacity: 0;
  }
  .${leftToTight}-enter-active {
    transform: translateX(0);
    opacity: 1;
    transition: transform ${duration}ms ${timingFunction},
      opacity ${duration / 2}ms ${timingFunction};
  }

  .${leftToTight}-exit-active {
    transform: translateX(100%);
    opacity: 0;
    transition: transform ${duration}ms ${timingFunction},
      opacity ${duration / 2}ms ${timingFunction};
  }

  .${leftToTight}-exit-active
    ${ButtonBlockElement},
    .${leftToTight}-enter-active
    ${ButtonBlockElement},
    .${rightToLeft}-exit-active
    ${ButtonBlockElement},
    .${rightToLeft}-enter-active
    ${ButtonBlockElement} {
    display: none;

    position: absolute !important;

    ${(props) =>
      props.standalone && !props.extension
        ? css`
            bottom: 1rem !important;
          `
        : undefined}
  }
`;

export const ButtonBlock = React.forwardRef<HTMLDivElement, PropsWithChildren>(
  ({ children }, ref) => {
    const { standalone, extension } = useAppContext();
    return (
      <ButtonBlockElement ref={ref} standalone={standalone && !extension}>
        {children}
      </ButtonBlockElement>
    );
  }
);

export const ResultButton = styled.div<{ done?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  color: ${(props) =>
    props.done ? props.theme.accentGreen : props.theme.accentRed};
  height: 56px;
  width: 100%;
`;

export const Label = styled(Body1)`
  user-select: none;
  color: ${(props) => props.theme.textSecondary};
`;

export const childFactoryCreator =
  (right: boolean) => (child: React.ReactElement) =>
    React.cloneElement(child, {
      classNames: right ? rightToLeft : leftToTight,
      timeout: duration,
    });

export const useFiatAmount = (
  jettons: JettonsBalances,
  jetton: string,
  amount: BigNumber
) => {
  const { fiat } = useAppContext();
  const { data: stock } = useTonenpointStock();

  return useMemo(() => {
    const price = getFiatPrice(stock, jettons, fiat, jetton);
    if (!price) return undefined;

    const fiatAmount = getFiatAmountValue(
      price,
      amount.toFormat({
        decimalSeparator: getDecimalSeparator(),
        groupSeparator: getGroupSeparator(),
      })
    );
    return formatFiatCurrency(fiat, fiatAmount);
  }, [stock, jettons, fiat, jetton, amount]);
};

export const notifyError = async (
  client: QueryClient,
  sdk: IAppSdk,
  t: (value: string) => string,
  error: unknown
) => {
  if (seeIfBalanceError(error)) {
    sdk.uiEvents.emit('copy', {
      method: 'copy',
      params: t('send_screen_steps_amount_insufficient_balance'),
    });
  }

  if (seeIfTimeError(error)) {
    await cleanSyncDateBanner(client, sdk);
    sdk.alert(t('send_sending_wrong_time_description'));
  }

  throw error;
};

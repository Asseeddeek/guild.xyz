import { BigNumber } from "@ethersproject/bignumber"
import { useWeb3React } from "@web3-react/core"
import Button from "components/common/Button"
import useGuild from "components/[guild]/hooks/useGuild"
import { Chains, RPC } from "connectors"
import useBalance from "hooks/useBalance"
import { usePostHog } from "posthog-js/react"
import useAllowance from "../../hooks/useAllowance"
import usePrice from "../../hooks/usePrice"
import usePurchaseAsset from "../../hooks/usePurchaseAsset"
import useTokenBuyerContractData from "../../hooks/useTokenBuyerContractData"
import { useGuildCheckoutContext } from "../GuildCheckoutContex"

const PurchaseButton = (): JSX.Element => {
  const posthog = usePostHog()
  const { urlName } = useGuild()

  const { account, chainId } = useWeb3React()
  const { requirement, pickedCurrency, agreeWithTOS } = useGuildCheckoutContext()

  const {
    data: { priceToSendInWei },
    isValidating: isPriceLoading,
    error,
  } = usePrice()

  const tokenBuyerContractData = useTokenBuyerContractData()

  const { allowance, isAllowanceLoading, allowanceError } = useAllowance(
    pickedCurrency,
    tokenBuyerContractData[Chains[chainId]]?.address
  )

  const { onSubmit, isLoading, estimateGasError } = usePurchaseAsset()

  const isSufficientAllowance =
    priceToSendInWei && allowance
      ? BigNumber.from(priceToSendInWei).lte(allowance)
      : false

  const {
    coinBalance,
    tokenBalance,
    isLoading: isBalanceLoading,
  } = useBalance(pickedCurrency, Chains[requirement?.chain])

  const pickedCurrencyIsNative =
    pickedCurrency === RPC[Chains[chainId]]?.nativeCurrency.symbol

  const isSufficientBalance =
    priceToSendInWei &&
    (coinBalance || tokenBalance) &&
    (pickedCurrencyIsNative
      ? coinBalance?.gt(BigNumber.from(priceToSendInWei))
      : tokenBalance?.gt(BigNumber.from(priceToSendInWei)))

  const isDisabled =
    !account ||
    error ||
    estimateGasError ||
    !agreeWithTOS ||
    Chains[chainId] !== requirement.chain ||
    (!pickedCurrencyIsNative &&
      (isPriceLoading ||
        isAllowanceLoading ||
        allowanceError ||
        !isSufficientAllowance)) ||
    isBalanceLoading ||
    !isSufficientBalance

  const errorMsg =
    (error && "Couldn't calculate price") ??
    (estimateGasError &&
      (estimateGasError?.data?.message?.includes("insufficient")
        ? "Insufficient funds for gas"
        : "Couldn't estimate gas")) ??
    (account && !isSufficientBalance && "Insufficient balance")

  const onClick = () => {
    onSubmit()
    posthog.capture("Click: PurchaseButton (GuildCheckout)", {
      guild: urlName,
    })
  }

  return (
    <Button
      size="lg"
      isDisabled={isDisabled}
      isLoading={isLoading}
      loadingText="Check your wallet"
      colorScheme={!isDisabled ? "blue" : "gray"}
      w="full"
      onClick={onClick}
      data-dd-action-name="PurchaseButton (GuildCheckout)"
    >
      {errorMsg || "Purchase"}
    </Button>
  )
}

export default PurchaseButton

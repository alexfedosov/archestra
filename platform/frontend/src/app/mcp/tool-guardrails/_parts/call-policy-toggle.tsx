import { Ban, Check, Handshake, ShieldQuestion, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ASK_WEBHOOK_ACTION,
  ASK_WEBHOOK_REQUIRES_URL_MESSAGE,
  type CallPolicyAction,
} from "@/lib/policy.utils";

const REQUIRE_APPROVAL_DESCRIPTION =
  "Requires user confirmation before executing in chat. In autonomous agent sessions (A2A, API, MS Teams, subagents), the tool call is blocked.";
const WEBHOOK_POLICY_EXTENSION_DESCRIPTION =
  "Calls the configured webhook policy extension and requires an allow decision before executing.";

const CALL_POLICY_OPTIONS: { value: CallPolicyAction; label: string }[] = [
  { value: "allow_when_context_is_untrusted", label: "Allow always" },
  {
    value: "block_when_context_is_untrusted",
    label: "Allow in safe context",
  },
  { value: "require_approval", label: "Require approval" },
  {
    value: "require_webhook_policy_extension_decision",
    label: "Ask webhook",
  },
  { value: "block_always", label: "Block always" },
];

interface CallPolicyToggleProps {
  value: CallPolicyAction;
  onChange: (action: CallPolicyAction) => void;
  disabled?: boolean;
  webhookPolicyExtensionConfigured?: boolean;
  size?: "sm" | "lg";
}

export function CallPolicyToggle({
  value,
  onChange,
  disabled,
  webhookPolicyExtensionConfigured,
  size = "sm",
}: CallPolicyToggleProps) {
  const isWebhookPolicyExtensionUnavailable =
    webhookPolicyExtensionConfigured !== true;

  if (size === "lg") {
    return (
      <Select
        value={value}
        onValueChange={(val: CallPolicyAction) => {
          if (val === ASK_WEBHOOK_ACTION && isWebhookPolicyExtensionUnavailable)
            return;
          onChange(val);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select policy" />
        </SelectTrigger>
        <SelectContent>
          {CALL_POLICY_OPTIONS.map(({ value, label }) => (
            <SelectItem
              key={value}
              value={value}
              disabled={
                value === ASK_WEBHOOK_ACTION &&
                isWebhookPolicyExtensionUnavailable
              }
              description={
                value === "require_approval"
                  ? REQUIRE_APPROVAL_DESCRIPTION
                  : value === ASK_WEBHOOK_ACTION
                    ? isWebhookPolicyExtensionUnavailable
                      ? ASK_WEBHOOK_REQUIRES_URL_MESSAGE
                      : WEBHOOK_POLICY_EXTENSION_DESCRIPTION
                    : undefined
              }
            >
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const buttonClass = "h-7 w-7 p-0";

  const getButtonClassName = (action: CallPolicyAction) =>
    `${buttonClass} ${value === action ? "bg-background hover:bg-background border border-muted-foreground/30 shadow-xs rounded-md" : "bg-secondary hover:bg-secondary/80 border-0 text-foreground/50"}`;

  return (
    <div className="rounded-md bg-secondary p-[2px] flex gap-[1px]">
      <TooltipProvider delayDuration={100}>
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={getButtonClassName("allow_when_context_is_untrusted")}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (value !== "allow_when_context_is_untrusted") {
                  onChange("allow_when_context_is_untrusted");
                }
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Allow always</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={100}>
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={getButtonClassName("block_when_context_is_untrusted")}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (value !== "block_when_context_is_untrusted") {
                  onChange("block_when_context_is_untrusted");
                }
              }}
            >
              <Handshake className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Allow in safe context</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={100}>
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={getButtonClassName("require_approval")}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (value !== "require_approval") {
                  onChange("require_approval");
                }
              }}
            >
              <ShieldQuestion className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium">Require approval</p>
            <p className="text-xs opacity-80">{REQUIRE_APPROVAL_DESCRIPTION}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={100}>
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                size="sm"
                variant="ghost"
                className={getButtonClassName(ASK_WEBHOOK_ACTION)}
                disabled={disabled || isWebhookPolicyExtensionUnavailable}
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    value !== ASK_WEBHOOK_ACTION &&
                    !isWebhookPolicyExtensionUnavailable
                  ) {
                    onChange(ASK_WEBHOOK_ACTION);
                  }
                }}
              >
                <Webhook className="h-3.5 w-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium">Ask webhook</p>
            <p className="text-xs opacity-80">
              {isWebhookPolicyExtensionUnavailable
                ? ASK_WEBHOOK_REQUIRES_URL_MESSAGE
                : WEBHOOK_POLICY_EXTENSION_DESCRIPTION}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={100}>
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={getButtonClassName("block_always")}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (value !== "block_always") {
                  onChange("block_always");
                }
              }}
            >
              <Ban className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Block always</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

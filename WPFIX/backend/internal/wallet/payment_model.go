package wallet

import "time"

type PaymentToken struct {
	Token    string    `json:"token"`
	Amount   int       `json:"amount"`
	Merchant string    `json:"merchant"`
	Expiry   time.Time `json:"expiry"`
	WalletID uint      `json:"wallet_id"`
	Type     string    `json:"type"` // "purchase" or "transfer"
}

type PaymentTokenRequest struct {
	Amount   int    `json:"amount" binding:"required,gt=0"`
	Merchant string `json:"merchant" binding:"required"`
	Type     string `json:"type" binding:"required,oneof=purchase transfer"`
}

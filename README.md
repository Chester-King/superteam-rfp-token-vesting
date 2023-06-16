# Token Vesting Program Tutorial

The Token Vesting program is a smart contract built on the Solana blockchain that enables the creation of time-based vesting schedules for tokens. This tutorial will guide you through the process of setting up and using the Token Vesting program, catering to users with different levels of expertise.

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Usage](#usage)

## Introduction

The Token Vesting program allows you to lock tokens in an escrow account and define a specific unlock time. This ensures that the tokens are not accessible until the unlock time is reached. Once the unlock time arrives, the authorized recipient can withdraw the tokens from the escrow account.

## Prerequisites

Before you can use the Token Vesting program, make sure you have the following prerequisites:

- Basic knowledge of the Solana blockchain ecosystem.
- Familiarity with Rust programming language.
- Installed Rust, Solana, Anchor, and the Solana Token Program.

## Installation

To get started with the Token Vesting program, follow these steps:

1. Clone the Token Vesting repository:

```shell
git clone https://github.com/Chester-King/superteam-rfp-token-vesting.git
cd superteam-rfp-token-vesting
```

2. Build the program:

```shell
anchor build
```

3. Deploy the program to the Solana blockchain:

```shell
anchor deploy
```

## Usage 

The Token Vesting program provides two main methods for interacting with the escrow accounts:

1. `escrow_creation`: Creates an escrow account and locks the specified amount of tokens until the unlock time.
2. `escrow_withdraw`: Allows the authorized recipient to withdraw tokens from the escrow account after the unlock time.


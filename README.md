# DAO Voting System

A decentralized autonomous organization (DAO) voting system built on the Solana blockchain using Anchor framework. This system allows users to create proposals, vote on them, and receive rewards for participation.

## Features

- Create and manage proposals
- Vote on active proposals
- Reward system for voting participation
- Close proposals

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Rust and Cargo (latest stable version)
- Solana CLI tools (v1.14.0 or later)
- Anchor CLI (v0.29.0 or later)
- Node.js (v14 or later)
- Yarn or npm

## Installation

1. Clone the repository:
    ```sh
    git clone git@github.com:0xCipherCoder/dao-voting-system.git
    cd dao-voting-system
    ```

2. Install dependencies:
    ```sh
    npm install
    anchor build
    ```

3. Deploy the programs to Solana Local Tesnet:
    ```sh
    anchor deploy
    ```

## Usage 

### Test the overall functionality with test cases:

    anchor test
  

### Prerequisites

Ensure you have a local Solana cluster running:
```sh
solana-test-validator


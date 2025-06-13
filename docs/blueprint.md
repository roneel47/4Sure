# **App Name**: NumberLock Duel

## Core Features:

- Duel Panel UI: Two player panels that present turn based number guessing input interfaces
- Automated User Auth: Authentication with automatically generated user name stored locally to be re-used across game sessions. Only when both players have authed can the game commence.
- Capture Secret: Capture a 4-digit secret number input. Feedback shown to user only when the number guessed exactly matches (both the digit and the digit position).
- Turn Tracker: Track each game's turns in real time to determine who goes next.
- Display Guesses and Feedback: Display last few guesses along with an exact matches shown by digit in a green background, but no indication when any given digit is present at a different position.
- Data Cleansing on Exit: Clear any single-player user and game data when that player clicks exit/back/end buttons. Clear data of game when both players click those buttons.

## Style Guidelines:

- Primary color: Bright yellow (#FFF44F) for visibility and to add an optimistic sense of accomplishment. 
- Background color: Dark gray (#2E2E2E) to minimize eye strain, provide contrast with the bright primary, and communicate a clean and modern aesthetic.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text, combining techy feel with modern clarity.
- Clean, minimal interface with clear delineation between Player A and Player B panels.  Mobile-first responsive design to ensure usability on various screen sizes.
- Lock icons and green backgrounds used for clearly visualizing exactly positioned digits.
- Subtle animations to indicate correct digits (e.g., gentle scaling of lock icons, number 'wobble' for incorrect, etc.).
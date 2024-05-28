# Simple Discord Bot Setup

This documentation provides detailed steps to set up a simple Discord bot with a single command `/setup`. This is the direct result of my efforts to automate the setup of forum channels in Discord. I share this knowledge with you, detailing the steps and considerations I had to address. The challenging part was /setup. The setup command builds a modal for you to interact with, and then, based off your input the bot creates two new forum channels, which must be root channels initially. After creating them, I then create a category and move these channels under the category. Additionally, I set the bot role as the only one allowed to post in these channels and configured the new channels to display in gallery mode by default.

With all of this work in another project, I felt like it was worth rewriting the entire thing to share, and remind future me I did do this already. So, you now have a Discord.js bot, that will setup two new forum channels and set them to display in gallery view by default, along with making it's "bot" role the only role allowed to post. 

## Prerequisites

1. **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).
2. **Discord Bot Token**: You need to create a bot on the [Discord Developer Portal](https://discord.com/developers/applications). Save the bot token for later use.
3. **Discord Client ID**: You can find this in the OAuth2 section of your bot on the Discord Developer Portal.
4. **Install Dependencies**:

```
npm install discord.js dotenv
```

## Directory Structure

Create the following directory structure:

```
/my_simple_bot
|-- bot.js
|-- commands
|   |-- setup.js
|-- config.json
|-- .env
```

## .env File

Create a `.env` file with the following content:

```
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
CLIENT_ID=YOUR_DISCORD_CLIENT_ID
```

Replace `YOUR_DISCORD_BOT_TOKEN` and `YOUR_DISCORD_CLIENT_ID` with your actual Discord bot token and client ID.

## config.json

Create a `config.json` file with the following content:

```
{
    "branding": {
        "footer": "All rights reserved.",
        "image": "https://example.com/your-image.png"
    }
}
```

## bot.js

Create the `bot.js` file with the following content:

```
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

discordClient.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    discordClient.commands.set(command.data.name, command);
    console.log(`Loaded command ${command.data.name}`);
}

discordClient.once('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);

    // Register commands with Discord
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: discordClient.commands.map(command => command.data.toJSON()) },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

discordClient.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = discordClient.commands.get(interaction.commandName);
    if (command) {
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);
```

## setup.js

Create the `setup.js` file inside a `commands` directory with the following content:

```
const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup the bot by creating a bot role and channels.')
        .addStringOption(option => 
            option.setName('category_name')
                .setDescription('The name of the category to create')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('channel_one')
                .setDescription('The name of the first forum channel')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('channel_two')
                .setDescription('The name of the second forum channel')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'You need administrator permissions to run this command!', ephemeral: true });
            return;
        }

        const categoryName = interaction.options.getString('category_name');
        const channelOneName = interaction.options.getString('channel_one');
        const channelTwoName = interaction.options.getString('channel_two');
        const guild = interaction.guild;

        // Create bot role if it doesn't exist
        let botRole = guild.roles.cache.find(role => role.name === 'Bot');
        if (!botRole) {
            botRole = await guild.roles.create({
                name: 'Bot',
                color: 'BLUE',
                reason: 'Role for the bot to manage channels'
            });
        }

        // Add bot to the role if it's not already in it
        if (!interaction.guild.members.me.roles.cache.has(botRole.id)) {
            await interaction.guild.members.me.roles.add(botRole);
        }

        // Create category
        const category = await guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory
        });

        const spectacularZebra = {
            emoji: '\u2764\uFE0F', 
        };

        // Create forum channels
        const channelOptions = {
            type: ChannelType.GuildForum,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.SendMessages]
                },
                {
                    id: botRole.id,
                    allow: [PermissionsBitField.Flags.SendMessages]
                }
            ],
            defaultReactionEmoji: { name: spectacularZebra.emoji },
            rateLimitPerUser: 10 // 10 seconds slowmode
        };

        const channelOne = await guild.channels.create({ 
            name: channelOneName, 
            ...channelOptions 
        });
        const channelTwo = await guild.channels.create({ 
            name: channelTwoName, 
            ...channelOptions 
        });

        // Set default layout to Gallery view for both channels
        await channelOne.edit({ defaultForumLayout: 2 });
        await channelTwo.edit({ defaultForumLayout: 2 });

        await interaction.reply({ content: `Setup complete! Created category \`${categoryName}\` with channels \`${channelOneName}\` and \`${channelTwoName}\` set to Gallery view.`, ephemeral: true });
    }
};
```

## Running the Bot

After creating these files, you can start your bot using the following command:

```sh
npm start

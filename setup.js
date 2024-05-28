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
            defaultReactionEmoji: { emoji: '🔥' }, // Using fire emoji
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

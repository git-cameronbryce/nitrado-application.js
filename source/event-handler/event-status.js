const { Events, Embed, EmbedBuilder } = require('discord.js');
const { db } = require('../script');
const axios = require('axios');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    async function loop() {

      let output = '';
      let counter = 0, current = 0, page = 0;
      const validService = async (nitrado, status, services) => {
        const platforms = { arkxb: true, arkps: true, arkse: true };
        const channel = await client.channels.fetch(status.channel);
        const message = await channel.messages.fetch(status.message);

        const actions = await Promise.all(
          services.map(async (service) => {
            if (platforms[service.details.folder_short]) {
              const url = `https://api.nitrado.net/services/${service.id}/gameservers`;
              const response = await axios.get(url, { headers: { Authorization: nitrado.token } });
              const { status, query } = response.data.data.gameserver;
              const { suspend_date } = service;
              counter++;

              return { status, query, service, suspend_date };
            }
          })
        );

        const sortedActions = actions
          .filter((action) => action) // Filtering out undefined values.
          .sort((a, b) => b.query.player_current - a.query.player_current); // Sorting based on current population.

        let output = '';
        sortedActions.slice(0, 5).forEach((action) => {
          const { status, query, service, suspend_date } = action;
          const time = new Date(suspend_date).getTime() / 1000;

          switch (status) {
            case 'started':
              output += `\`🟢\` \`Service Online\`\n${query.server_name.slice(0, 40)}...\nPlayer Count: \`${query.player_current}/${query.player_max}\`\nID: ||${service.id}||\n\n**Server Runtime**\n<t:${time}:f>\n\n`;
              break;
            case 'restarted':
              output += `\`🟠\` \`Service Restarting\`\n${query.server_name.slice(0, 40)}...\nPlayer Count: \`${query.player_current}/${query.player_max}\`\nID: ||${service.id}||\n\n**Server Runtime**\n<t:${time}:f>\n\n`;
              break;
            case 'updating':
              output += `\`🟠\` \`Service Updating\`\n${query.server_name.slice(0, 40)}...\nPlayer Count: \`${query.player_current}/${query.player_max}\`\nID: ||${service.id}||\n\n**Server Runtime**\n<t:${time}:f>\n\n`;
              break;
            case 'stopping':
              output += `\`🔴\` \`Service Stopping\`\n${query.server_name.slice(0, 40)}...\nPlayer Count: \`${query.player_current}/${query.player_max}\`\nID: ||${service.id}||\n\n**Server Runtime**\n<t:${time}:f>\n\n`;
              break;
            case 'stopped':
              output += `\`🔴\` \`Service Stopped\`\n${query.server_name.slice(0, 40)}...\nPlayer Count: \`${query.player_current}/${query.player_max}\`\nID: ||${service.id}||\n\n**Server Runtime**\n<t:${time}:f>\n\n`;
              break;
            default:
              break;
          }
        });

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setDescription(`${output}`)
          .setFooter({ text: 'Tip: Contact support if there are issues.' })
          .setImage('https://i.imgur.com/2ZIHUgx.png');

        await message.edit({ embeds: [embed] });
      };



      const validToken = async (nitrado, status) => {
        const url = 'https://api.nitrado.net/services';
        const response = await axios.get(url, { headers: { 'Authorization': nitrado.token } })

        const services = response.data.data.services;
        response.status === 200 ? validService(nitrado, status, services) : invalidService()
      }

      const validDocument = async ({ nitrado, status }) => {
        const url = 'https://oauth.nitrado.net/token';
        const response = await axios.get(url, { headers: { 'Authorization': nitrado.token } })
        response.status === 200 ? validToken(nitrado, status) : invalidToken()
      }

      const reference = await db.collection('configuration').get();
      reference.forEach(doc => {
        doc.data() ? validDocument(doc.data()) : console.log('Invalid document.');
      });
      setTimeout(loop, 60000);
    }
    loop().then(() => console.log('Loop started:'));
  },
};


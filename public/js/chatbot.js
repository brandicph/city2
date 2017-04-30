$(document).ready(function() {

    var ChatBot = function() {

        var settings = {
            name: 'Amaibotto',
            speed: 500,
        };


        var $chat = $('.chat');
        var $conversation = $('.conversation', $chat);
        var $message = $('.message', $chat);
        var _self = this;

        _self.send = function(message) {
            _self.bubble('You', message, true);

            _self.register(message);
        };

        _self.receive = function(from, message) {
            _self.bubble(from, message, false);
        };

        _self.register = function(message) {

            _self.think(message, function(error, output) {
                if (!error) {
                    _self.receive(settings.name, output);
                } else {
                    _self.receive(settings.name, error);
                }

            });
        };

        _self.think = function(message, cb) {

            $('.typing', $conversation).removeClass('hidden');

            var answer = `Sorry, but my master didn't teach me how to process that...`;


            setTimeout(function() {
                $('.typing', $conversation).addClass('hidden');

                cb.call(_self, null, answer);

            }, settings.speed);

        };

        _self.bubble = function(from, message, sender = false) {
            var content = $('<div/>', {
                class: 'content',
                title: new Date(),
                html: message
            });

            var meta = $('<div/>', {
                class: 'meta',
                text: from
            });

            var bubble = $('<div/>', {
                    class: `bubble ${sender ? 'you' : 'other'}`,
                    title: new Date(),
                })
                .append(content)
                .append(meta)
                .appendTo($conversation);

            $conversation.scrollTop(function() {
                return this.scrollHeight;
            });

            $('a.dummy-link', content).click(function(e) {
                e.preventDefault();
                alert('You stupid fuck');
                _self.bubble(settings.name, 'Why would you ever click on that link?', false);
            });

            $('img', content).on('load', function() {
                $conversation.scrollTop(function() {
                    return this.scrollHeight;
                });
            });
        };

        _self.init = function() {
            $message.keypress(function(e) {
                if (e.which == 13) {
                    const message = $(this).val();
                    if (message.length > 0) {

                        _self.send(message);
                        $message.val(null);

                    }
                    return false; //<---- Add this line
                }
            });
            _self.receive(settings.name, `Hi, my name is <b>${settings.name}</b>!<br/>I would love to learn something new... but first tell me your name?`);

            return _self;
        };

        return _self.init();
    }();

    window.ChatBot = ChatBot;

});
# initializer for mongoid-history
# per the documentation this declaration is optional,
# but https://github.com/mongoid/mongoid-history/issues/192 indicates it's not
Mongoid::History.tracker_class_name = :history_tracker

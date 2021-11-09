class ActiveRecordUtils
  # plucks the given attrs from the query, and returns a hash of attr=>value
  def self.pluck_to_hash(query, attrs)
    query.pluck(*attrs).map { |p| attrs.zip(p).to_h }
  end
end

class PostgresConnection
  @@conn = nil
  def self.get
    if @@conn.nil?
      @@conn = PG.connect(dbname: 'scp_perf')
    end
    @@conn
  end
end
